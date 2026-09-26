const express = require('express');
const prisma = require('../db');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

router.use(verifyJWT);

// GET /api/movements?product=&warehouseId=&movementType=&reference=&dateFrom=&dateTo=
router.get('/', async (req, res, next) => {
  try {
    const { product, warehouseId, movementType, reference, dateFrom, dateTo, search } = req.query;

    const where = {};

    if (movementType && movementType !== 'ALL') {
      where.movementType = movementType;
    }

    if (warehouseId && warehouseId !== 'ALL') {
      where.warehouseId = warehouseId;
    }

    if (product) {
      where.product = {
        OR: [
          { name: { contains: product, mode: 'insensitive' } },
          { sku: { contains: product, mode: 'insensitive' } },
        ],
      };
    }

    if (reference) {
      where.reference = { contains: reference, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { product: { name: { contains: search, mode: 'insensitive' } } },
        { product: { sku: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: true,
        warehouse: true,
        fromLocation: true,
        toLocation: true,
        user: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      take: 100,
    });

    res.json(movements);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
