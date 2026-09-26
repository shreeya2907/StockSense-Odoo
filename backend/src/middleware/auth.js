const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'stocksense_super_secret_jwt_key_2024';

function verifyJWT(req, res, next) {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Session expired or invalid. Please log in again.' });
  }
}

function requireManager(req, res, next) {
  if (!req.user || req.user.role !== 'MANAGER') {
    return res.status(403).json({
      message: 'Access Denied: Inventory Manager privileges required. Staff accounts are restricted from this action.',
      requiredRole: 'MANAGER',
      currentRole: req.user?.role || 'STAFF',
    });
  }
  next();
}

module.exports = { verifyJWT, requireManager, JWT_SECRET };
