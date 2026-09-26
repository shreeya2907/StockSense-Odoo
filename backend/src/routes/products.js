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
    } = req.body;

    if (!name || !sku || !categoryId) {
      return res.status(400).json({ message: 'Name, SKU, and Category are required.' });
    }

    const existingSku = await prisma.product.findUnique({ where: { sku } });
    if (existingSku) {
      return res.status(400).json({ message: `A product with SKU "${sku}" already exists.` });
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku: sku.trim().toUpperCase(),
        categoryId,
        uom: uom || 'Units',
        reorderLevel: Number(reorderLevel) || 10,
        unitCost: Number(unitCost) || 0.0,
        defaultWarehouseId: defaultWarehouseId || null,
        defaultLocationId: defaultLocationId || null,
      },
      include: { category: true },
    });

    // Optionally seed initial stock if warehouse and location provided
    if (defaultWarehouseId && defaultLocationId && initialQuantity && initialQuantity > 0) {
      await prisma.stock.create({
        data: {
          productId: product.id,
          warehouseId: defaultWarehouseId,
          locationId: defaultLocationId,
          quantity: Number(initialQuantity),
        },
      });
    }

    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

// PUT /api/products/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, sku, categoryId, uom, reorderLevel, unitCost, defaultWarehouseId, defaultLocationId } =
      req.body;

    if (sku) {
      const existing = await prisma.product.findFirst({
        where: { sku: sku.trim().toUpperCase(), NOT: { id: req.params.id } },
      });
      if (existing) {
        return res.status(400).json({ message: `A product with SKU "${sku}" already exists.` });
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
        defaultWarehouseId,
        defaultLocationId,
      },
      include: { category: true, defaultLocation: true },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
