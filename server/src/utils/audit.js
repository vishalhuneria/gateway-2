import AuditLog from '../models/AuditLog.js';

export async function writeAudit(req, action, entityType, entityId = '', outcome = 'success', details = {}) {
  try {
    await AuditLog.create({
      actorId: req.user?._id || null,
      actorEmail: req.user?.email || '',
      actorRole: req.user?.role || '',
      action,
      entityType,
      entityId: String(entityId || ''),
      outcome,
      details,
      ip: req.ip || '',
      userAgent: req.get('user-agent') || ''
    });
  } catch (error) {
    // Audit failures should be visible in server logs; never leak request data.
    console.error('Audit log write failed:', error.message);
  }
}
