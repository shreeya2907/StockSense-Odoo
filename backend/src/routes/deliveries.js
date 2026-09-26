const express = require('express');
const prisma = require('../db');
const { verifyJWT } = require('../middleware/auth');
const { generateReference } = require('../utils/referenceGenerator');
const { validateDelivery } = require('../utils/stockEngine');

const router = express.Router();

router.use(verifyJWT);

// GET /api/deliveries?search=&status=
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
        { customerName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const deliveries = await prisma.delivery.findMany({
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

    res.json(deliveries);
  } catch (err) {
    next(err);
  }
});

// GET /api/deliveries/:id
router.get('/:id', async (req, res, next) => {
  try {
    const delivery = await prisma.delivery.findUnique({
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

    if (!delivery) return res.status(404).json({ message: 'Delivery not found' });
    res.json(delivery);
  } catch (err) {
    next(err);
  }
});

// POST /api/deliveries
router.post('/', async (req, res, next) => {
  try {
    const { customerName, warehouseId, items } = req.body;

    if (!customerName || !warehouseId) {
      return res.status(400).json({ message: 'Customer name and Warehouse are required.' });
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

    const reference = await generateReference(warehouse.code, 'OUT');

    const delivery = await prisma.delivery.create({
      data: {
        reference,
        customerName,
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

    res.status(201).json(delivery);
  } catch (err) {
    next(err);
  }
});

// PUT /api/deliveries/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { customerName, items } = req.body;
    const existing = await prisma.delivery.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Delivery not found' });
    if (existing.status === 'DONE') {
      return res.status(400).json({ message: 'Cannot edit a validated delivery' });
    }

    if (items) {
      await prisma.deliveryItem.deleteMany({ where: { deliveryId: req.params.id } });
      await prisma.deliveryItem.createMany({
        data: items.map((it) => ({
          deliveryId: req.params.id,
          productId: it.productId,
          locationId: it.locationId,
          quantity: Number(it.quantity),
        })),
      });
    }

    const updated = await prisma.delivery.update({
      where: { id: req.params.id },
      data: {
        customerName: customerName || undefined,
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

// POST /api/deliveries/:id/validate
router.post('/:id/validate', async (req, res, next) => {
  try {
    const validated = await validateDelivery(req.params.id, req.user.id);
    res.json({ message: 'Delivery validated successfully. Stock deducted.', delivery: validated });
  } catch (err) {
    next(err);
  }
});

// POST /api/deliveries/:id/cancel
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const existing = await prisma.delivery.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: 'Delivery not found' });
    if (existing.status === 'DONE') {
      return res.status(400).json({ message: 'Cannot cancel a validated delivery' });
    }

    const updated = await prisma.delivery.update({
      where: { id: req.params.id },
      data: { status: 'CANCELED' },
    });

    res.json({ message: 'Delivery canceled', delivery: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
