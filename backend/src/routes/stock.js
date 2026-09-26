const express = require('express');
const prisma = require('../db');
const { verifyJWT } = require('../middleware/auth');

const router = express.Router();

router.use(verifyJWT);

// GET /api/stock?productId=&locationId=&warehouseId=
router.get('/', async (req, res, next) => {
  try {
    const { productId, locationId, warehouseId } = req.query;

    const where = {};
    if (productId) where.productId = productId;
    if (locationId) where.locationId = locationId;
    if (warehouseId) where.warehouseId = warehouseId;

    const stocks = await prisma.stock.findMany({
      where,
      include: {
        product: true,
        warehouse: true,
        location: true,
      },
    });

    res.json(stocks);
  } catch (err) {
    next(err);
  }
});

// GET /api/stock/onhand?productId=&locationId=
router.get('/onhand', async (req, res, next) => {
  try {
    const { productId, locationId } = req.query;
    if (!productId || !locationId) {
      return res.status(400).json({ message: 'productId and locationId are required' });
    }

    const stock = await prisma.stock.findUnique({
      where: {
        productId_locationId: {
          productId,
          locationId,
        },
      },
      include: { product: true, location: true },
    });

    res.json({
      quantity: stock ? stock.quantity : 0,
      stock,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
