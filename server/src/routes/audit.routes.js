import { Router } from 'express';
import AuditLog from '../models/AuditLog.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/httpError.js';

const router = Router();
router.use(authenticate, requireRoles('admin'));
router.get('/', asyncHandler(async (req, res) => {
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 150));
  const items = await AuditLog.find({}).sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ items });
}));
export default router;
