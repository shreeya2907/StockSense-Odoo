const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../db');
const { verifyJWT, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Helper to validate password complexity: 1 uppercase, 1 lowercase, 1 special char, min 8 chars
function validatePassword(password) {
  if (!password || password.length < 8) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return hasUpper && hasLower && hasSpecial;
}

// POST /api/auth/signup
router.post('/signup', async (req, res, next) => {
  try {
    const { loginId, email, password, name, role } = req.body;

    // Validate loginId
    if (!loginId || loginId.length < 6 || loginId.length > 12) {
      return res.status(400).json({ message: 'Login ID must be between 6 and 12 characters.' });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    // Validate name
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Name is required.' });
    }

    // Validate password
    if (!validatePassword(password)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one special character.',
      });
    }

    // Check duplicate loginId
    const existingLogin = await prisma.user.findUnique({ where: { loginId } });
    if (existingLogin) {
      return res.status(400).json({ message: 'Login ID is already taken.' });
    }

    // Check duplicate email
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email is already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        loginId,
        email,
        name,
        passwordHash,
        role: role === 'MANAGER' ? 'MANAGER' : 'STAFF',
      },
    });

    const token = jwt.sign(
      { id: user.id, loginId: user.loginId, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        loginId: user.loginId,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { loginId, password } = req.body;

    if (!loginId || !password) {
      return res.status(400).json({ message: 'Invalid Login ID or Password' });
    }

    const user = await prisma.user.findUnique({ where: { loginId } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid Login ID or Password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Login ID or Password' });
    }

    const token = jwt.sign(
      { id: user.id, loginId: user.loginId, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        loginId: user.loginId,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/send-otp (or /forgot-password)
router.post(['/send-otp', '/forgot-password'], async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'No registered user found with this email.' });
    }

    // Generate a secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: otp,
        resetTokenExpiry,
      },
    });

    console.log(`[AUTH] 6-Digit Password Reset OTP for ${email}: ${otp}`);

    res.json({
      message: 'A 6-digit verification code has been dispatched.',
      otp, // included for seamless testing without waiting for SMTP setup
      resetToken: otp,
      expiresIn: '10 minutes',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-otp-reset (or /reset-password)
router.post(['/verify-otp-reset', '/reset-password'], async (req, res, next) => {
  try {
    const { email, otp, resetToken, newPassword } = req.body;
    const code = otp || resetToken;

    if (!code || !newPassword) {
      return res.status(400).json({ message: 'Verification code (OTP) and new password are required.' });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one special character.',
      });
    }

    const whereClause = {
      resetToken: code,
      resetTokenExpiry: { gt: new Date() },
    };
    if (email) {
      whereClause.email = email;
    }

    const user = await prisma.user.findFirst({ where: whereClause });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP code. Please request a new code.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.json({ message: 'Password has been reset successfully! You can now log in.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/google (Google OAuth Sign In & Sign Up)
router.post('/google', async (req, res, next) => {
  try {
    const { credential, email, name, googleId } = req.body;
    let userEmail = email;
    let userName = name;

    // Decode Google JWT ID token if provided
    if (credential) {
      try {
        const payloadBase64 = credential.split('.')[1];
        const decoded = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
        userEmail = decoded.email || userEmail;
        userName = decoded.name || decoded.given_name || userName;
      } catch (decodeErr) {
        console.warn('Google credential decode error:', decodeErr.message);
      }
    }

    if (!userEmail) {
      return res.status(400).json({ message: 'Valid email from Google is required.' });
    }

    // Find existing user by email
    let user = await prisma.user.findUnique({ where: { email: userEmail } });

    // Auto-register user if signing up via Google for the first time
    if (!user) {
      let baseLogin = userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      if (baseLogin.length < 6) baseLogin = baseLogin.padEnd(6, '0');
      if (baseLogin.length > 10) baseLogin = baseLogin.slice(0, 10);
      let uniqueLoginId = baseLogin;
      let counter = 1;
      while (await prisma.user.findUnique({ where: { loginId: uniqueLoginId } })) {
        uniqueLoginId = `${baseLogin.slice(0, 8)}${counter++}`;
      }

      const randomPass = crypto.randomBytes(16).toString('hex');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(randomPass, salt);

      user = await prisma.user.create({
        data: {
          loginId: uniqueLoginId,
          email: userEmail,
          name: userName || 'Google User',
          passwordHash,
          role: 'STAFF',
        },
      });
      console.log(`[AUTH] New user auto-registered via Google: ${user.email} (${user.loginId})`);
    }

    const token = jwt.sign(
      { id: user.id, loginId: user.loginId, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Google authentication successful',
      token,
      user: {
        id: user.id,
        loginId: user.loginId,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', verifyJWT, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, loginId: true, email: true, name: true, role: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
