const express = require('express');
const prisma = require('../db');
const { verifyJWT } = require('../middleware/auth');
const { generateReference } = require('../utils/referenceGenerator');
const { validateAdjustment } = require('../utils/stockEngine');

const router = express.Router();

router.use(verifyJWT);

// GET /api/adjustments
router.get('/', async (req, res, next) => {
  try {
    const { search, status } = req.query;

    const where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { product: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const adjustments = await prisma.adjustment.findMany({
      where,
      include: {
        product: true,
        warehouse: true,
        location: true,
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(adjustments);
  } catch (err) {
    next(err);
  }
});

// GET /api/adjustments/:id
router.get('/:id', async (req, res, next) => {
  try {
    const adjustment = await prisma.adjustment.findUnique({
      where: { id: req.params.id },
      include: {
        product: true,
        warehouse: true,
        location: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!adjustment) return res.status(404).json({ message: 'Adjustment not found' });
    res.json(adjustment);
  } catch (err) {
    next(err);
  }
});

// POST /api/adjustments
router.post('/', async (req, res, next) => {
  try {
    const { productId, warehouseId, locationId, countedQuantity, reason } = req.body;

    if (!productId || !warehouseId || !locationId || countedQuantity === undefined) {
      return res.status(400).json({
        message: 'Product, Warehouse, Location, and Counted Quantity are required.',
      });
    }

    const parsedCounted = Number(countedQuantity);
    if (isNaN(parsedCounted) || parsedCounted < 0) {
      return res.status(400).json({ message: 'Counted quantity cannot be negative.' });
    }

    // Capture current system quantity
    const stock = await prisma.stock.findUnique({
      where: {
        productId_locationId: {
          productId,
          locationId,
        },
      },
    });

    const systemQuantity = stock ? stock.quantity : 0;
    const difference = parsedCounted - systemQuantity;

    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) return res.status(404).json({ message: 'Warehouse not found' });

    const reference = await generateReference(warehouse.code, 'ADJ');

    const validReasons = ['DAMAGED', 'LOST', 'FOUND', 'COUNTING_ERROR', 'OTHER'];
    const adjustmentReason = validReasons.includes(reason) ? reason : 'COUNTING_ERROR';

    const adjustment = await prisma.adjustment.create({
      data: {
        reference,
        productId,
        warehouseId,
        locationId,
        systemQuantity,
        countedQuantity: parsedCounted,
        difference,
        reason: adjustmentReason,
        status: 'DRAFT',
        createdBy: req.user.id,
      },
      include: {
        product: true,
        warehouse: true,
        location: true,
      },
    });

    res.status(201).json(adjustment);
  } catch (err) {
    next(err);
  }
});

// POST /api/adjustments/:id/validate
router.post('/:id/validate', async (req, res, next) => {
  try {
    const validated = await validateAdjustment(req.params.id, req.user.id);
    res.json({
      message: 'Adjustment validated successfully. Stock reconciled.',
      adjustment: validated,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/adjustments/:id/cancel
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const existing = await prisma.adjustment.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Adjustment not found' });
    if (existing.status === 'DONE') {
      return res.status(400).json({ message: 'Cannot cancel a validated adjustment' });
    }

    const updated = await prisma.adjustment.update({
      where: { id: req.params.id },
      data: { status: 'CANCELED' },
    });

    res.json({ message: 'Adjustment canceled', adjustment: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
