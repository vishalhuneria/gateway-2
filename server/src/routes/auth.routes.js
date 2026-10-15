import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { config } from '../config.js';
import { HttpError, asyncHandler } from '../utils/httpError.js';
import { writeAudit } from '../utils/audit.js';

const router = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Too many login attempts. Try again later.' } });
const allowedDomains = ['@iitrpr.ac.in', '@campus.edu'];

function cleanUser(user) {
  return { id: String(user._id), name: user.name || '', email: user.email, role: user.role, entryNumber: user.entryNumber || null };
}
function tokenFor(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn, issuer: 'gateway-api', audience: 'gateway-client' });
}

router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password, role, entryNumber } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!name || String(name).trim().length < 2) throw new HttpError(400, 'Please enter your full name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new HttpError(400, 'Enter a valid institutional email address.');
  if (!allowedDomains.some((domain) => normalizedEmail.endsWith(domain))) throw new HttpError(403, `Only institutional emails ending in ${allowedDomains.join(' or ')} can register.`);
  if (!['student', 'faculty'].includes(role)) throw new HttpError(403, 'Public registration is limited to student and faculty accounts.');
  if (typeof password !== 'string' || password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters long.');
  if (role === 'student' && !String(entryNumber || '').trim()) throw new HttpError(400, 'Student entry/roll number is required.');
  const exists = await User.findOne({ email: normalizedEmail });
  if (exists) throw new HttpError(409, 'An account with this email already exists. Sign in instead.');
  const user = await User.create({
    name: String(name).trim(),
    email: normalizedEmail,
    passwordHash: await bcrypt.hash(password, 12),
    role,
    entryNumber: role === 'student' ? String(entryNumber).trim().toUpperCase() : null
  });
  await writeAudit(req, 'auth.register', 'user', user._id, 'success', { role: user.role });
  res.status(201).json({ token: tokenFor(user), user: cleanUser(user) });
}));

router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = req.body?.password;
  if (!email || typeof password !== 'string') throw new HttpError(400, 'Email and password are required.');
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
    await writeAudit(req, 'auth.login', 'user', email, 'denied', { reason: 'invalid_credentials' });
    throw new HttpError(401, 'Invalid email or password.');
  }
  user.lastLoginAt = new Date();
  await user.save();
  await writeAudit(req, 'auth.login', 'user', user._id, 'success', { role: user.role });
  res.json({ token: tokenFor(user), user: cleanUser(user) });
}));

router.get('/me', authenticate, (req, res) => res.json({ user: cleanUser(req.user) }));
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  await writeAudit(req, 'auth.logout', 'user', req.user._id);
  // JWT access tokens are stateless; the client discards this token on logout.
  res.json({ message: 'Signed out on this device.' });
}));

export default router;
