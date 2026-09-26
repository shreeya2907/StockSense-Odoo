const express = require('express');
const prisma = require('../db');
const { verifyJWT, requireManager } = require('../middleware/auth');
const { generateReference } = require('../utils/referenceGenerator');
const { validateTransfer } = require('../utils/stockEngine');

const router = express.Router();

router.use(verifyJWT);

// GET /api/transfers?search=&status=
router.get('/', async (req, res, next) => {
  try {
    const { search, status } = req.query;

    const where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search) {
      where.reference = { contains: search, mode: 'insensitive' };
    }

    const transfers = await prisma.transfer.findMany({
      where,
      include: {
        sourceWarehouse: true,
        sourceLocation: true,
        destWarehouse: true,
        destLocation: true,
        user: { select: { id: true, name: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(transfers);
  } catch (err) {
    next(err);
  }
});

// GET /api/transfers/:id
router.get('/:id', async (req, res, next) => {
  try {
    const transfer = await prisma.transfer.findUnique({
      where: { id: req.params.id },
      include: {
        sourceWarehouse: true,
        sourceLocation: true,
        destWarehouse: true,
        destLocation: true,
        user: { select: { id: true, name: true, email: true } },
        items: { include: { product: true } },
      },
    });

    if (!transfer) return res.status(404).json({ message: 'Transfer not found' });
    res.json(transfer);
  } catch (err) {
    next(err);
  }
});

// POST /api/transfers
router.post('/', async (req, res, next) => {
  try {
    const {
      sourceWarehouseId,
      sourceLocationId,
      destWarehouseId,
      destLocationId,
      items,
    } = req.body;

    if (!sourceWarehouseId || !sourceLocationId || !destWarehouseId || !destLocationId) {
      return res.status(400).json({
        message: 'Source and destination warehouses and locations are required.',
      });
    }

    if (sourceLocationId === destLocationId) {
      return res.status(400).json({
        message: 'Source and destination locations cannot be identical.',
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Please provide at least one product line.' });
    }

    for (const it of items) {
      if (!it.productId || !it.quantity || Number(it.quantity) <= 0) {
        return res.status(400).json({
          message: 'Each item must have a product and a positive quantity.',
        });
      }
    }

    const sourceWh = await prisma.warehouse.findUnique({ where: { id: sourceWarehouseId } });
    if (!sourceWh) return res.status(404).json({ message: 'Source warehouse not found' });

    const reference = await generateReference(sourceWh.code, 'INT');

    const transfer = await prisma.transfer.create({
      data: {
        reference,
        sourceWarehouseId,
        sourceLocationId,
        destWarehouseId,
        destLocationId,
        status: 'DRAFT',
        createdBy: req.user.id,
        items: {
          create: items.map((it) => ({
            productId: it.productId,
            quantity: Number(it.quantity),
          })),
        },
      },
      include: {
        sourceWarehouse: true,
        sourceLocation: true,
        destWarehouse: true,
        destLocation: true,
        items: { include: { product: true } },
      },
    });

    res.status(201).json(transfer);
  } catch (err) {
    next(err);
  }
});

// POST /api/transfers/:id/validate (Manager Privilege Required)
router.post('/:id/validate', requireManager, async (req, res, next) => {
  try {
    const validated = await validateTransfer(req.params.id, req.user.id);
    res.json({
      message: 'Transfer validated successfully. Stock relocated.',
      transfer: validated,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/transfers/:id/cancel
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const existing = await prisma.transfer.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Transfer not found' });
    if (existing.status === 'DONE') {
      return res.status(400).json({ message: 'Cannot cancel a validated transfer' });
    }

    const updated = await prisma.transfer.update({
      where: { id: req.params.id },
      data: { status: 'CANCELED' },
    });

    res.json({ message: 'Transfer canceled', transfer: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
