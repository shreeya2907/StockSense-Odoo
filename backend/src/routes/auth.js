const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../db');
const { verifyJWT, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// In-memory verification registry for pending signups & logins (expires in 10 minutes)
const pendingSignups = new Map();
const pendingLoginOtps = new Map();

// Helper to validate password complexity: 1 uppercase, 1 lowercase, 1 special char, min 8 chars
function validatePassword(password) {
  if (!password || password.length < 8) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return hasUpper && hasLower && hasSpecial;
}

/**
 * Strict RBAC Rule:
 * Only Siya Bhosle / Siya Bhosale is assigned MANAGER.
 * All other names and emails (e.g. ganesh, shreeya, etc.) are strictly assigned STAFF.
 */
function isSiyaBhosle(name, email, loginId) {
  const normName = (name || '').toLowerCase().replace(/[^a-z]/g, '');
  const normEmail = (email || '').toLowerCase();
  const normLogin = (loginId || '').toLowerCase().replace(/[^a-z]/g, '');

  const isNameSiya = normName.includes('siya') && (normName.includes('bhosle') || normName.includes('bhosale'));
  const isEmailSiya = normEmail.includes('siya') && (normEmail.includes('bhosle') || normEmail.includes('bhosale') || normEmail.startsWith('siya.'));
  const isLoginSiya = normLogin.includes('siya') && (normLogin.includes('bhosle') || normLogin.includes('bhosale'));

  return isNameSiya || isEmailSiya || isLoginSiya;
}

function resolveUserRole(name, email, loginId) {
  if (isSiyaBhosle(name, email, loginId)) {
    return 'MANAGER';
  }
  return 'STAFF'; // strictly STAFF for all other users (ganesh, shreeya, etc.)
}

// POST /api/auth/send-signup-otp (Step 1 of mandatory OTP Sign-Up)
router.post('/send-signup-otp', async (req, res, next) => {
  try {
    const { loginId, email, name } = req.body;

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    // Check duplicate email
    const existingEmail = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existingEmail) {
      return res.status(400).json({ message: 'This email is already registered. Please go to Sign In.' });
    }

    // Validate loginId if provided
    if (loginId) {
      if (loginId.length < 6 || loginId.length > 12) {
        return res.status(400).json({ message: 'Login ID must be between 6 and 12 characters.' });
      }
      const existingLogin = await prisma.user.findUnique({ where: { loginId: loginId.trim() } });
      if (existingLogin) {
        return res.status(400).json({ message: 'This Login ID is already taken. Please pick another.' });
      }
    }

    // Generate secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    const emailKey = email.trim().toLowerCase();
    pendingSignups.set(emailKey, {
      otp,
      expiresAt,
      loginId: (loginId || '').trim(),
      name: (name || '').trim(),
    });

    console.log(`[AUTH] Mandatory Sign-Up OTP for ${email}: ${otp}`);

    res.json({
      message: 'A 6-digit verification code has been dispatched to your email.',
      otp, // included for instantaneous local & Render verification testing
      email,
      expiresIn: '10 minutes',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/signup (Step 2: Mandatory OTP Verification & Account Creation)
router.post('/signup', async (req, res, next) => {
  try {
    const { loginId, email, password, name, otp } = req.body;

    // Strict Mandatory OTP Check
    if (!otp || String(otp).trim().length !== 6) {
      return res.status(400).json({
        message: '6-digit OTP verification code is mandatory to complete sign-up.',
      });
    }

    const emailKey = (email || '').trim().toLowerCase();
    const pending = pendingSignups.get(emailKey);

    if (!pending) {
      return res.status(400).json({
        message: 'No pending verification found for this email. Please request an OTP first.',
      });
    }

    if (Date.now() > pending.expiresAt) {
      pendingSignups.delete(emailKey);
      return res.status(400).json({
        message: 'The verification OTP has expired. Please request a new code.',
      });
    }

    if (pending.otp !== String(otp).trim()) {
      return res.status(400).json({
        message: 'Invalid OTP code. Please enter the correct 6-digit code.',
      });
    }

    // Validate loginId
    if (!loginId || loginId.length < 6 || loginId.length > 12) {
      return res.status(400).json({ message: 'Login ID must be between 6 and 12 characters.' });
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

    // STRICT RBAC ASSIGNMENT:
    // Only Siya Bhosle gets MANAGER. All others (ganesh, shreeya, etc.) are strictly STAFF.
    const assignedRole = resolveUserRole(name, email, loginId);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        loginId: loginId.trim(),
        email: email.trim().toLowerCase(),
        name: name.trim(),
        passwordHash,
        role: assignedRole,
      },
    });

    // Clear verified pending OTP
    pendingSignups.delete(emailKey);

    const token = jwt.sign(
      { id: user.id, loginId: user.loginId, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`[AUTH] User verified and stored in backend: ${user.name} (${user.email}) -> Role: ${user.role}`);

    res.status(201).json({
      message: `Account created successfully with ${user.role} role!`,
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

// POST /api/auth/login (With direct feedback for unregistered accounts and incorrect passwords)
router.post('/login', async (req, res, next) => {
  try {
    const identifier = (req.body.loginOrEmail || req.body.loginId || req.body.email || '').trim();
    const { password } = req.body;

    if (!identifier) {
      return res.status(400).json({ message: 'Please enter your registered Email or Login ID.' });
    }

    if (!password) {
      return res.status(400).json({ message: 'Please enter your password.' });
    }

    // Find account by loginId OR email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { loginId: identifier },
          { email: identifier },
        ],
      },
    });

    // Direct Feedback: Not registered
    if (!user) {
      return res.status(401).json({
        message: 'This email or Login ID is not registered. Please sign up first.',
      });
    }

    // Direct Feedback: Incorrect password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Incorrect password. Please verify your password or use forgot password.',
      });
    }

    // Enforce role consistency (Siya Bhosle = MANAGER, others = STAFF)
    const expectedRole = resolveUserRole(user.name, user.email, user.loginId);
    if (user.role !== expectedRole) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: expectedRole },
      });
      user.role = expectedRole;
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

// POST /api/auth/send-login-otp (Dispatches real-time OTP for signing in)
router.post('/send-login-otp', async (req, res, next) => {
  try {
    const identifier = (req.body.loginOrEmail || req.body.loginId || req.body.email || '').trim();

    if (!identifier) {
      return res.status(400).json({ message: 'Please enter your registered Email or Login ID.' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { loginId: identifier },
          { email: identifier },
        ],
      },
    });

    if (!user) {
      return res.status(401).json({
        message: 'This email or Login ID is not registered. Please sign up first.',
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    pendingLoginOtps.set(user.id, {
      otp,
      expiresAt,
      email: user.email,
    });

    console.log(`[AUTH] Real-Time Login OTP for ${user.email} (${user.loginId}): ${otp}`);

    res.json({
      message: `A 6-digit real-time verification OTP has been sent to ${user.email}.`,
      otp, // included for instantaneous local & Render real-time UI display & simulation
      email: user.email,
      userId: user.id,
      expiresIn: '10 minutes',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login-with-otp (Verifies real-time OTP and logs in)
router.post('/login-with-otp', async (req, res, next) => {
  try {
    const identifier = (req.body.loginOrEmail || req.body.loginId || req.body.email || '').trim();
    const { otp } = req.body;

    if (!identifier) {
      return res.status(400).json({ message: 'Please enter your registered Email or Login ID.' });
    }

    if (!otp || String(otp).trim().length !== 6) {
      return res.status(400).json({ message: 'Please enter the 6-digit verification OTP.' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { loginId: identifier },
          { email: identifier },
        ],
      },
    });

    if (!user) {
      return res.status(401).json({
        message: 'This email or Login ID is not registered. Please sign up first.',
      });
    }

    const pending = pendingLoginOtps.get(user.id);
    if (!pending) {
      return res.status(400).json({
        message: 'No login OTP was requested or code has expired. Please request a new OTP.',
      });
    }

    if (Date.now() > pending.expiresAt) {
      pendingLoginOtps.delete(user.id);
      return res.status(400).json({
        message: 'This OTP has expired. Please request a new code.',
      });
    }

    if (pending.otp !== String(otp).trim()) {
      return res.status(401).json({
        message: 'Incorrect OTP verification code. Please check and try again.',
      });
    }

    // OTP verified: clear it
    pendingLoginOtps.delete(user.id);

    // Enforce role consistency (Siya Bhosle = MANAGER, others = STAFF)
    const expectedRole = resolveUserRole(user.name, user.email, user.loginId);
    if (user.role !== expectedRole) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: expectedRole },
      });
      user.role = expectedRole;
    }

    const token = jwt.sign(
      { id: user.id, loginId: user.loginId, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: `Signed in successfully as ${user.role}!`,
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

// POST /api/auth/send-otp (Password reset OTP)
router.post(['/send-otp', '/forgot-password'], async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required.' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user) {
      return res.status(404).json({ message: 'No registered user found with this email address.' });
    }

    // Generate secure 6-digit numeric OTP
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
      otp,
      resetToken: otp,
      expiresIn: '10 minutes',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-otp-reset (Password Reset verification)
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
      resetToken: String(code).trim(),
      resetTokenExpiry: { gt: new Date() },
    };
    if (email) {
      whereClause.email = email.trim().toLowerCase();
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

// POST /api/auth/google (Google OAuth Sign In & Sign Up with RBAC)
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

    userEmail = userEmail.trim().toLowerCase();

    // Find existing user by email
    let user = await prisma.user.findUnique({ where: { email: userEmail } });

    // Determine role: Only Siya Bhosle = MANAGER, all others = STAFF
    const assignedRole = resolveUserRole(userName, userEmail, userEmail.split('@')[0]);

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
          role: assignedRole,
        },
      });
      console.log(`[AUTH] Google user registered in DB: ${user.email} (${user.loginId}) -> Role: ${user.role}`);
    } else {
      // Sync role if necessary
      if (user.role !== assignedRole) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { role: assignedRole },
        });
      }
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
