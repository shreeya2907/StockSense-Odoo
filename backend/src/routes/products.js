const express = require('express');
const prisma = require('../db');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

router.use(verifyJWT);

// GET /api/products?search=&categoryId=
router.get('/', async (req, res, next) => {
  try {
    const { search, categoryId } = req.query;

    const where = {};
    if (categoryId && categoryId !== 'ALL') {
      where.categoryId = categoryId;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        defaultLocation: { include: { warehouse: true } },
        stocks: { include: { warehouse: true, location: true } },
      },
      orderBy: { name: 'asc' },
    });

    const enriched = products.map((p) => {
      const onHand = p.stocks.reduce((acc, s) => acc + s.quantity, 0);
      let status = 'IN_STOCK';
      if (onHand === 0) {
        status = 'OUT_OF_STOCK';
      } else if (onHand <= p.reorderLevel) {
        status = 'LOW_STOCK';
      }

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        categoryId: p.categoryId,
        categoryName: p.category ? p.category.name : 'Uncategorized',
        uom: p.uom,
        reorderLevel: p.reorderLevel,
        unitCost: p.unitCost,
        defaultWarehouseId: p.defaultWarehouseId,
        defaultWarehouseName: p.defaultLocation?.warehouse?.name || 'N/A',
        defaultLocationId: p.defaultLocationId,
        defaultLocationName: p.defaultLocation?.name || 'N/A',
        onHand,
        freeToUse: onHand,
        status,
        stocks: p.stocks,
      };
    });

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        defaultLocation: { include: { warehouse: true } },
        stocks: { include: { warehouse: true, location: true } },
      },
    });

    if (!product) return res.status(404).json({ message: 'Product not found' });

    const onHand = product.stocks.reduce((acc, s) => acc + s.quantity, 0);
    res.json({
      ...product,
      onHand,
      freeToUse: onHand,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/products
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      sku,
      categoryId,
      uom,
      reorderLevel,
      unitCost,
      defaultWarehouseId,
      defaultLocationId,
      initialQuantity,
      stockQuantity,
      quantity,
      onHand,
    } = req.body;

    if (!name || !sku || !categoryId) {
      return res.status(400).json({ message: 'Name, SKU, and Category are required.' });
    }

    const existingSku = await prisma.product.findUnique({ where: { sku: sku.trim().toUpperCase() } });
    if (existingSku) {
      return res.status(400).json({ message: `A product with SKU "${sku}" already exists.` });
    }

    // Resolve warehouse and location
    let targetWhId = defaultWarehouseId || null;
    let targetLocId = defaultLocationId || null;

    if (targetWhId) {
      const wh = await prisma.warehouse.findUnique({
        where: { id: targetWhId },
        include: { locations: true },
      });
      if (wh && wh.locations.length > 0) {
        if (!targetLocId || !wh.locations.some((l) => l.id === targetLocId)) {
          targetLocId = wh.locations[0].id;
        }
      }
    }

    if (!targetWhId || !targetLocId) {
      const firstWh = await prisma.warehouse.findFirst({
        include: { locations: true },
      });
      if (firstWh) {
        targetWhId = targetWhId || firstWh.id;
        if (firstWh.locations.length > 0) {
          targetLocId = targetLocId || firstWh.locations[0].id;
        } else {
          const newLoc = await prisma.location.create({
            data: { warehouseId: firstWh.id, name: 'Stock Area' },
          });
          targetLocId = newLoc.id;
        }
      }
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku: sku.trim().toUpperCase(),
        categoryId,
        uom: uom || 'Units',
        reorderLevel: Number(reorderLevel) || 10,
        unitCost: Number(unitCost) || 0.0,
        defaultWarehouseId: targetWhId,
        defaultLocationId: targetLocId,
      },
      include: { category: true, defaultLocation: { include: { warehouse: true } } },
    });

    const enteredQty = Number(initialQuantity ?? stockQuantity ?? quantity ?? onHand ?? 0);

    if (targetWhId && targetLocId && !isNaN(enteredQty) && enteredQty > 0) {
      await prisma.stock.upsert({
        where: {
          productId_locationId: {
            productId: product.id,
            locationId: targetLocId,
          },
        },
        update: {
          quantity: enteredQty,
          warehouseId: targetWhId,
        },
        create: {
          productId: product.id,
          warehouseId: targetWhId,
          locationId: targetLocId,
          quantity: enteredQty,
        },
      });

      // Log movement for tracking and digital twin
      try {
        await prisma.stockMovement.create({
          data: {
            reference: `INIT-${product.sku}`,
            productId: product.id,
            movementType: 'IN',
            quantity: enteredQty,
            toLocationId: targetLocId,
            warehouseId: targetWhId,
            userId: req.user?.id || (await prisma.user.findFirst())?.id,
            status: 'COMPLETED',
          },
        });
      } catch (err) {
        console.warn('Initial stock movement log warning:', err.message);
      }
    }

    const stocks = await prisma.stock.findMany({
      where: { productId: product.id },
      include: { warehouse: true, location: true },
    });
    const finalOnHand = stocks.reduce((acc, s) => acc + s.quantity, 0);

    let status = 'IN_STOCK';
    if (finalOnHand === 0) {
      status = 'OUT_OF_STOCK';
    } else if (finalOnHand <= product.reorderLevel) {
      status = 'LOW_STOCK';
    }

    res.status(201).json({
      ...product,
      onHand: finalOnHand,
      freeToUse: finalOnHand,
      status,
      stocks,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/products/:id
router.put('/:id', async (req, res, next) => {
  try {
    const {
      name,
      sku,
      categoryId,
      uom,
      reorderLevel,
      unitCost,
      defaultWarehouseId,
      defaultLocationId,
      initialQuantity,
      stockQuantity,
      quantity,
      onHand,
    } = req.body;

    if (sku) {
      const existing = await prisma.product.findFirst({
        where: { sku: sku.trim().toUpperCase(), NOT: { id: req.params.id } },
      });
      if (existing) {
        return res.status(400).json({ message: `A product with SKU "${sku}" already exists.` });
      }
    }

    const currentProduct = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { stocks: true },
    });
    if (!currentProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let targetWhId = defaultWarehouseId || currentProduct.defaultWarehouseId;
    let targetLocId = defaultLocationId || currentProduct.defaultLocationId;

    if (!targetWhId || !targetLocId) {
      const firstWh = await prisma.warehouse.findFirst({ include: { locations: true } });
      if (firstWh) {
        targetWhId = targetWhId || firstWh.id;
        targetLocId = targetLocId || firstWh.locations[0]?.id;
      }
    }

    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        name,
        sku: sku ? sku.trim().toUpperCase() : undefined,
        categoryId,
        uom,
        reorderLevel: reorderLevel !== undefined ? Number(reorderLevel) : undefined,
        unitCost: unitCost !== undefined ? Number(unitCost) : undefined,
        defaultWarehouseId: targetWhId,
        defaultLocationId: targetLocId,
      },
      include: { category: true, defaultLocation: { include: { warehouse: true } } },
    });

    // Update stock if requested
    const enteredQty =
      stockQuantity !== undefined
        ? stockQuantity
        : initialQuantity !== undefined
        ? initialQuantity
        : quantity !== undefined
        ? quantity
        : onHand;

    if (
      enteredQty !== undefined &&
      enteredQty !== null &&
      !isNaN(Number(enteredQty)) &&
      targetWhId &&
      targetLocId
    ) {
      const newQty = Number(enteredQty);
      await prisma.stock.upsert({
        where: {
          productId_locationId: {
            productId: updated.id,
            locationId: targetLocId,
          },
        },
        update: {
          quantity: newQty,
          warehouseId: targetWhId,
        },
        create: {
          productId: updated.id,
          warehouseId: targetWhId,
          locationId: targetLocId,
          quantity: newQty,
        },
      });

      // Log movement for tracking
      try {
        await prisma.stockMovement.create({
          data: {
            reference: `ADJ-${updated.sku}`,
            productId: updated.id,
            movementType: 'IN',
            quantity: newQty,
            toLocationId: targetLocId,
            warehouseId: targetWhId,
            userId: req.user?.id || (await prisma.user.findFirst())?.id,
            status: 'COMPLETED',
          },
        });
      } catch (err) {
        console.warn('Stock adjustment movement warning:', err.message);
      }
    }

    const stocks = await prisma.stock.findMany({
      where: { productId: updated.id },
      include: { warehouse: true, location: true },
    });
    const finalOnHand = stocks.reduce((acc, s) => acc + s.quantity, 0);

    let status = 'IN_STOCK';
    if (finalOnHand === 0) {
      status = 'OUT_OF_STOCK';
    } else if (finalOnHand <= updated.reorderLevel) {
      status = 'LOW_STOCK';
    }

    res.json({
      ...updated,
      onHand: finalOnHand,
      freeToUse: finalOnHand,
      status,
      stocks,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
