const express = require('express');
const prisma = require('../db');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

router.use(verifyJWT);

// GET /api/dashboard/summary - Live computed KPIs
router.get('/summary', async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        stocks: true,
      },
    });

    let totalProducts = products.length;
    let lowStock = 0;
    let outOfStock = 0;
    let totalStockValue = 0;

    for (const p of products) {
      const onHand = p.stocks.reduce((acc, s) => acc + s.quantity, 0);
      if (onHand === 0) {
        outOfStock++;
      } else if (onHand <= p.reorderLevel) {
        lowStock++;
      }
      totalStockValue += onHand * (p.unitCost || 0);
    }

    const pendingReceipts = await prisma.receipt.count({
      where: { status: { in: ['DRAFT', 'WAITING', 'READY'] } },
    });

    const pendingDeliveries = await prisma.delivery.count({
      where: { status: { in: ['DRAFT', 'WAITING', 'READY'] } },
    });

    const pendingTransfers = await prisma.transfer.count({
      where: { status: { in: ['DRAFT', 'WAITING', 'READY'] } },
    });

    res.json({
      totalProducts,
      lowStock,
      outOfStock,
      pendingReceipts,
      pendingDeliveries,
      pendingTransfers,
      totalStockValue: Math.round(totalStockValue * 100) / 100,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/recent?type=&status=&warehouseId=
router.get('/recent', async (req, res, next) => {
  try {
    const { type, status, warehouseId } = req.query;

    let operations = [];

    // Fetch Receipts
    if (!type || type === 'ALL' || type === 'RECEIPT') {
      const where = {};
      if (status && status !== 'ALL') where.status = status;
      if (warehouseId && warehouseId !== 'ALL') where.warehouseId = warehouseId;

      const receipts = await prisma.receipt.findMany({
        where,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { warehouse: true, user: { select: { name: true } }, items: true },
      });

      receipts.forEach((r) => {
        operations.push({
          id: r.id,
          reference: r.reference,
          type: 'RECEIPT',
          partner: r.supplierName,
          warehouse: r.warehouse.name,
          warehouseCode: r.warehouse.code,
          itemCount: r.items.length,
          status: r.status,
          createdAt: r.createdAt,
        });
      });
    }

    // Fetch Deliveries
    if (!type || type === 'ALL' || type === 'DELIVERY') {
      const where = {};
      if (status && status !== 'ALL') where.status = status;
      if (warehouseId && warehouseId !== 'ALL') where.warehouseId = warehouseId;

      const deliveries = await prisma.delivery.findMany({
        where,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { warehouse: true, user: { select: { name: true } }, items: true },
      });

      deliveries.forEach((d) => {
        operations.push({
          id: d.id,
          reference: d.reference,
          type: 'DELIVERY',
          partner: d.customerName,
          warehouse: d.warehouse.name,
          warehouseCode: d.warehouse.code,
          itemCount: d.items.length,
          status: d.status,
          createdAt: d.createdAt,
        });
      });
    }

    // Fetch Transfers
    if (!type || type === 'ALL' || type === 'TRANSFER') {
      const where = {};
      if (status && status !== 'ALL') where.status = status;
      if (warehouseId && warehouseId !== 'ALL') {
        where.OR = [{ sourceWarehouseId: warehouseId }, { destWarehouseId: warehouseId }];
      }

      const transfers = await prisma.transfer.findMany({
        where,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          sourceWarehouse: true,
          destWarehouse: true,
          sourceLocation: true,
          destLocation: true,
          user: { select: { name: true } },
          items: true,
        },
      });

      transfers.forEach((t) => {
        operations.push({
          id: t.id,
          reference: t.reference,
          type: 'TRANSFER',
          partner: `${t.sourceWarehouse.code} -> ${t.destWarehouse.code}`,
          warehouse: `${t.sourceWarehouse.name} to ${t.destWarehouse.name}`,
          warehouseCode: t.sourceWarehouse.code,
          itemCount: t.items.length,
          status: t.status,
          createdAt: t.createdAt,
        });
      });
    }

    // Sort by createdAt descending
    operations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(operations.slice(0, 15));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
