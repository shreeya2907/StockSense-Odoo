const express = require('express');
const prisma = require('../db');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

router.use(verifyJWT);

// GET /api/locations?warehouseId=
router.get('/', async (req, res, next) => {
  try {
    const { warehouseId } = req.query;
    const where = {};
    if (warehouseId && warehouseId !== 'ALL') {
      where.warehouseId = warehouseId;
    }

    const locations = await prisma.location.findMany({
      where,
      include: {
        warehouse: true,
        stocks: { include: { product: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(locations);
  } catch (err) {
    next(err);
  }
});

// POST /api/locations
router.post('/', async (req, res, next) => {
  try {
    const { warehouseId, name } = req.body;
    if (!warehouseId || !name) {
      return res.status(400).json({ message: 'Warehouse ID and location name are required' });
    }

    const existing = await prisma.location.findUnique({
      where: {
        warehouseId_name: {
          warehouseId,
          name: name.trim(),
        },
      },
    });

    if (existing) {
      return res.status(400).json({ message: `Location "${name}" already exists in this warehouse` });
    }

    const location = await prisma.location.create({
      data: {
        warehouseId,
        name: name.trim(),
      },
      include: { warehouse: true },
    });

    res.status(201).json(location);
  } catch (err) {
    next(err);
  }
});

// PUT /api/locations/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name } = req.body;
    const updated = await prisma.location.update({
      where: { id: req.params.id },
      data: { name: name ? name.trim() : undefined },
      include: { warehouse: true },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
