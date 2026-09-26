require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const productRoutes = require('./routes/products');
const receiptRoutes = require('./routes/receipts');
const deliveryRoutes = require('./routes/deliveries');
const transferRoutes = require('./routes/transfers');
const adjustmentRoutes = require('./routes/adjustments');
const movementRoutes = require('./routes/movements');
const warehouseRoutes = require('./routes/warehouses');
const locationRoutes = require('./routes/locations');
const categoryRoutes = require('./routes/categories');
const stockRoutes = require('./routes/stock');
const intelligenceRoutes = require('./routes/intelligence');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend clients (development and production)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'StockSense API',
    timestamp: new Date().toISOString(),
  });
});

// Resource Routers
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/adjustments', adjustmentRoutes);
app.use('/api/movements', movementRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/intelligence', intelligenceRoutes);

// Global Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`StockSense API server running on port ${PORT}`);
});
