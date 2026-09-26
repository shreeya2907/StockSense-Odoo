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

// Serve frontend static build if present
const path = require('path');
const fs = require('fs');
const frontendDist = path.join(__dirname, '../../frontend/dist');

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  // Friendly API Landing Route if frontend is deployed separately
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>StockSense API — Live</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 60px 20px; background: #0F172A; color: #F8FAFC; }
            .card { max-width: 600px; margin: 0 auto; background: #1E293B; padding: 40px; border-radius: 16px; border: 1px solid #334155; }
            h1 { color: #818CF8; font-size: 2rem; margin-bottom: 12px; }
            p { color: #94A3B8; font-size: 1.05rem; line-height: 1.6; }
            .badge { display: inline-block; background: #065F46; color: #34D399; font-weight: 700; padding: 6px 14px; border-radius: 9999px; margin-bottom: 20px; font-size: 0.85rem; }
            a { color: #60A5FA; text-decoration: none; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">● OPERATIONAL & LIVE</div>
            <h1>StockSense API Server</h1>
            <p>The backend Web Service is running with PostgreSQL and Google Gemini AI Brain.</p>
            <p style="margin-top: 24px;">Check API Health: <a href="/api/health">/api/health</a></p>
          </div>
        </body>
      </html>
    `);
  });
}

app.listen(PORT, () => {
  console.log(`StockSense API server running on port ${PORT}`);
});

