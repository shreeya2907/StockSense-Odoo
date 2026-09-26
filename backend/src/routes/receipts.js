const express = require('express');
const prisma = require('../db');
const { verifyJWT } = require('../middleware/auth');
const { generateReference } = require('../utils/referenceGenerator');
const { validateReceipt } = require('../utils/stockEngine');

const router = express.Router();

router.use(verifyJWT);

// GET /api/receipts?search=&status=
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
        { supplierName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const receipts = await prisma.receipt.findMany({
      where,
      include: {
        warehouse: true,
        user: { select: { id: true, name: true } },
        items: {
          include: {
            product: true,
            location: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(receipts);
  } catch (err) {
    next(err);
  }
});

// GET /api/receipts/:id
router.get('/:id', async (req, res, next) => {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: { id: req.params.id },
      include: {
        warehouse: true,
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: true,
            location: true,
          },
        },
      },
    });

    if (!receipt) return res.status(404).json({ message: 'Receipt not found' });
    res.json(receipt);
  } catch (err) {
    next(err);
  }
});

// POST /api/receipts
router.post('/', async (req, res, next) => {
  try {
    const { supplierName, warehouseId, items } = req.body;

    if (!supplierName || !warehouseId) {
      return res.status(400).json({ message: 'Supplier name and Warehouse are required.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Please provide at least one product line.' });
    }

    for (const it of items) {
      if (!it.productId || !it.locationId || !it.quantity || Number(it.quantity) <= 0) {
        return res.status(400).json({
          message: 'Each item must have a product, location, and a positive quantity.',
        });
      }
    }

    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) return res.status(404).json({ message: 'Warehouse not found' });

    const reference = await generateReference(warehouse.code, 'IN');

    const receipt = await prisma.receipt.create({
      data: {
        reference,
        supplierName,
        warehouseId,
        status: 'DRAFT',
        createdBy: req.user.id,
        items: {
          create: items.map((it) => ({
            productId: it.productId,
            locationId: it.locationId,
            quantity: Number(it.quantity),
          })),
        },
      },
      include: {
        warehouse: true,
        items: { include: { product: true, location: true } },
      },
    });

    res.status(201).json(receipt);
  } catch (err) {
    next(err);
  }
});

// PUT /api/receipts/:id (only editable if DRAFT or WAITING)
router.put('/:id', async (req, res, next) => {
  try {
    const { supplierName, items } = req.body;
    const existing = await prisma.receipt.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Receipt not found' });
    if (existing.status === 'DONE') {
      return res.status(400).json({ message: 'Cannot edit a validated receipt' });
    }

    if (items) {
      // Replace items
      await prisma.receiptItem.deleteMany({ where: { receiptId: req.params.id } });
      await prisma.receiptItem.createMany({
        data: items.map((it) => ({
          receiptId: req.params.id,
          productId: it.productId,
          locationId: it.locationId,
          quantity: Number(it.quantity),
        })),
      });
    }

    const updated = await prisma.receipt.update({
      where: { id: req.params.id },
      data: {
        supplierName: supplierName || undefined,
      },
      include: {
        warehouse: true,
        items: { include: { product: true, location: true } },
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/receipts/:id/validate
router.post('/:id/validate', async (req, res, next) => {
  try {
    const validated = await validateReceipt(req.params.id, req.user.id);
    res.json({ message: 'Receipt validated successfully. Stock updated.', receipt: validated });
  } catch (err) {
    next(err);
  }
});

// POST /api/receipts/:id/cancel
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const existing = await prisma.receipt.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Receipt not found' });
    if (existing.status === 'DONE') {
      return res.status(400).json({ message: 'Cannot cancel a validated receipt' });
    }

    const updated = await prisma.receipt.update({
      where: { id: req.params.id },
      data: { status: 'CANCELED' },
    });

    res.json({ message: 'Receipt canceled', receipt: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
