const express = require('express');
const prisma = require('../db');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

router.use(verifyJWT);

// GET /api/warehouses
router.get('/', async (req, res, next) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: {
        locations: true,
        _count: { select: { stocks: true, receipts: true, deliveries: true } },
      },
      orderBy: { code: 'asc' },
    });
    res.json(warehouses);
  } catch (err) {
    next(err);
  }
});

// GET /api/warehouses/:id
router.get('/:id', async (req, res, next) => {
  try {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: req.params.id },
      include: { locations: true },
    });
    if (!warehouse) return res.status(404).json({ message: 'Warehouse not found' });
    res.json(warehouse);
  } catch (err) {
    next(err);
  }
});

// POST /api/warehouses
router.post('/', async (req, res, next) => {
  try {
    const { code, name } = req.body;
    if (!code || !name) {
      return res.status(400).json({ message: 'Warehouse code and name are required' });
    }

    const existing = await prisma.warehouse.findUnique({ where: { code: code.trim().toUpperCase() } });
    if (existing) {
      return res.status(400).json({ message: `Warehouse code "${code}" is already in use` });
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
      },
      include: { locations: true },
    });
    res.status(201).json(warehouse);
  } catch (err) {
    next(err);
  }
});

// PUT /api/warehouses/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name } = req.body;
    const updated = await prisma.warehouse.update({
      where: { id: req.params.id },
      data: { name: name ? name.trim() : undefined },
      include: { locations: true },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
