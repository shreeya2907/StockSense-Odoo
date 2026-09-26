const prisma = require('../db');

/**
 * Single source of truth stock engine.
 * Executes within Prisma ACID transactions.
 */

async function validateReceipt(receiptId, userId) {
  return await prisma.$transaction(async (tx) => {
    const receipt = await tx.receipt.findUnique({
      where: { id: receiptId },
      include: { items: true, warehouse: true },
    });

    if (!receipt) throw new Error('Receipt not found');
    if (receipt.status === 'DONE') throw new Error('Receipt is already validated');
    if (receipt.status === 'CANCELED') throw new Error('Cannot validate a canceled receipt');
    if (!receipt.items || receipt.items.length === 0) throw new Error('Receipt has no items');

    for (const item of receipt.items) {
      if (item.quantity <= 0) {
        throw new Error(`Invalid quantity ${item.quantity} for product line`);
      }

      // Upsert stock record for (productId, locationId)
      await tx.stock.upsert({
        where: {
          productId_locationId: {
            productId: item.productId,
            locationId: item.locationId,
          },
        },
        update: {
          quantity: { increment: item.quantity },
        },
        create: {
          productId: item.productId,
          warehouseId: receipt.warehouseId,
          locationId: item.locationId,
          quantity: item.quantity,
        },
      });

      // Write immutable StockMovement ledger entry (type: IN, positive quantity)
      await tx.stockMovement.create({
        data: {
          reference: receipt.reference,
          productId: item.productId,
          movementType: 'IN',
          quantity: item.quantity,
          toLocationId: item.locationId,
          warehouseId: receipt.warehouseId,
          userId: userId || receipt.createdBy,
          status: 'COMPLETED',
        },
      });
    }

    const updated = await tx.receipt.update({
      where: { id: receiptId },
      data: {
        status: 'DONE',
        validatedAt: new Date(),
      },
      include: { items: { include: { product: true, location: true } }, warehouse: true },
    });

    return updated;
  });
}

async function validateDelivery(deliveryId, userId) {
  return await prisma.$transaction(async (tx) => {
    const delivery = await tx.delivery.findUnique({
      where: { id: deliveryId },
      include: { items: { include: { product: true, location: true } }, warehouse: true },
    });

    if (!delivery) throw new Error('Delivery not found');
    if (delivery.status === 'DONE') throw new Error('Delivery is already validated');
    if (delivery.status === 'CANCELED') throw new Error('Cannot validate a canceled delivery');
    if (!delivery.items || delivery.items.length === 0) throw new Error('Delivery has no items');

    // Check availability first
    const insufficientLines = [];
    for (const item of delivery.items) {
      if (item.quantity <= 0) {
        throw new Error(`Invalid quantity ${item.quantity} for product ${item.product.name}`);
      }

      const stock = await tx.stock.findUnique({
        where: {
          productId_locationId: {
            productId: item.productId,
            locationId: item.locationId,
          },
        },
      });

      const currentQty = stock ? stock.quantity : 0;
      if (currentQty < item.quantity) {
        insufficientLines.push({
          productId: item.productId,
          productName: item.product.name,
          locationName: item.location.name,
          requested: item.quantity,
          available: currentQty,
        });
      }
    }

    if (insufficientLines.length > 0) {
      const details = insufficientLines
        .map(
          (l) =>
            `${l.productName} at ${l.locationName}: requested ${l.requested}, available only ${l.available}`
        )
        .join('; ');
      const err = new Error(`Insufficient stock: ${details}`);
      err.insufficientLines = insufficientLines;
      err.status = 400;
      throw err;
    }

    // Deduct stock and write ledger
    for (const item of delivery.items) {
      await tx.stock.update({
        where: {
          productId_locationId: {
            productId: item.productId,
            locationId: item.locationId,
          },
        },
        data: {
          quantity: { decrement: item.quantity },
        },
      });

      await tx.stockMovement.create({
        data: {
          reference: delivery.reference,
          productId: item.productId,
          movementType: 'OUT',
          quantity: -item.quantity,
          fromLocationId: item.locationId,
          warehouseId: delivery.warehouseId,
          userId: userId || delivery.createdBy,
          status: 'COMPLETED',
        },
      });
    }

    const updated = await tx.delivery.update({
      where: { id: deliveryId },
      data: {
        status: 'DONE',
        validatedAt: new Date(),
      },
      include: { items: { include: { product: true, location: true } }, warehouse: true },
    });

    return updated;
  });
}

async function validateTransfer(transferId, userId) {
  return await prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findUnique({
      where: { id: transferId },
      include: {
        items: { include: { product: true } },
        sourceWarehouse: true,
        sourceLocation: true,
        destWarehouse: true,
        destLocation: true,
      },
    });

    if (!transfer) throw new Error('Transfer not found');
    if (transfer.status === 'DONE') throw new Error('Transfer is already validated');
    if (transfer.status === 'CANCELED') throw new Error('Cannot validate a canceled transfer');
    if (!transfer.items || transfer.items.length === 0) throw new Error('Transfer has no items');

    // Check source stock
    for (const item of transfer.items) {
      if (item.quantity <= 0) {
        throw new Error(`Invalid transfer quantity ${item.quantity} for product ${item.product.name}`);
      }

      const sourceStock = await tx.stock.findUnique({
        where: {
          productId_locationId: {
            productId: item.productId,
            locationId: transfer.sourceLocationId,
          },
        },
      });

      const currentSourceQty = sourceStock ? sourceStock.quantity : 0;
      if (currentSourceQty < item.quantity) {
        throw new Error(
          `Insufficient stock for ${item.product.name} at ${transfer.sourceLocation.name}: available ${currentSourceQty}, requested ${item.quantity}`
        );
      }
    }

    // Execute transfer: sourceStock -= qty, destStock += qty
    for (const item of transfer.items) {
      await tx.stock.update({
        where: {
          productId_locationId: {
            productId: item.productId,
            locationId: transfer.sourceLocationId,
          },
        },
        data: {
          quantity: { decrement: item.quantity },
        },
      });

      await tx.stock.upsert({
        where: {
          productId_locationId: {
            productId: item.productId,
            locationId: transfer.destLocationId,
          },
        },
        update: {
          quantity: { increment: item.quantity },
        },
        create: {
          productId: item.productId,
          warehouseId: transfer.destWarehouseId,
          locationId: transfer.destLocationId,
          quantity: item.quantity,
        },
      });

      // Write one ledger row per line
      await tx.stockMovement.create({
        data: {
          reference: transfer.reference,
          productId: item.productId,
          movementType: 'TRANSFER',
          quantity: item.quantity,
          fromLocationId: transfer.sourceLocationId,
          toLocationId: transfer.destLocationId,
          warehouseId: transfer.sourceWarehouseId,
          userId: userId || transfer.createdBy,
          status: 'COMPLETED',
        },
      });
    }

    const updated = await tx.transfer.update({
      where: { id: transferId },
      data: {
        status: 'DONE',
        validatedAt: new Date(),
      },
      include: {
        items: { include: { product: true } },
        sourceWarehouse: true,
        sourceLocation: true,
        destWarehouse: true,
        destLocation: true,
      },
    });

    return updated;
  });
}

async function validateAdjustment(adjustmentId, userId) {
  return await prisma.$transaction(async (tx) => {
    const adjustment = await tx.adjustment.findUnique({
      where: { id: adjustmentId },
      include: { product: true, warehouse: true, location: true },
    });

    if (!adjustment) throw new Error('Adjustment not found');
    if (adjustment.status === 'DONE') throw new Error('Adjustment is already validated');
    if (adjustment.status === 'CANCELED') throw new Error('Cannot validate a canceled adjustment');
    if (adjustment.countedQuantity < 0) throw new Error('Counted quantity cannot be negative');

    // Fetch live system quantity right before applying to ensure freshness
    const currentStock = await tx.stock.findUnique({
      where: {
        productId_locationId: {
          productId: adjustment.productId,
          locationId: adjustment.locationId,
        },
      },
    });

    const liveSystemQty = currentStock ? currentStock.quantity : 0;
    const diff = adjustment.countedQuantity - liveSystemQty;

    // Set stock to countedQuantity (not additive)
    await tx.stock.upsert({
      where: {
        productId_locationId: {
          productId: adjustment.productId,
          locationId: adjustment.locationId,
        },
      },
      update: {
        quantity: adjustment.countedQuantity,
      },
      create: {
        productId: adjustment.productId,
        warehouseId: adjustment.warehouseId,
        locationId: adjustment.locationId,
        quantity: adjustment.countedQuantity,
      },
    });

    // Write signed StockMovement (diff can be positive, negative, or 0)
    await tx.stockMovement.create({
      data: {
        reference: adjustment.reference,
        productId: adjustment.productId,
        movementType: 'ADJUSTMENT',
        quantity: diff,
        fromLocationId: diff < 0 ? adjustment.locationId : null,
        toLocationId: diff >= 0 ? adjustment.locationId : null,
        warehouseId: adjustment.warehouseId,
        userId: userId || adjustment.createdBy,
        status: 'COMPLETED',
      },
    });

    const updated = await tx.adjustment.update({
      where: { id: adjustmentId },
      data: {
        systemQuantity: liveSystemQty,
        difference: diff,
        status: 'DONE',
        validatedAt: new Date(),
      },
      include: { product: true, warehouse: true, location: true },
    });

    return updated;
  });
}

module.exports = {
  validateReceipt,
  validateDelivery,
  validateTransfer,
  validateAdjustment,
};
