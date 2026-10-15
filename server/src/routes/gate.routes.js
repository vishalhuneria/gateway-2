import { Router } from 'express';
import VisitorRequest from '../models/VisitorRequest.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { HttpError, asyncHandler } from '../utils/httpError.js';
import { writeAudit } from '../utils/audit.js';
import { publicVisitor } from '../utils/visitorView.js';
import { currentCampusDate } from './requests.routes.js';

const router = Router();
router.use(authenticate, requireRoles('guard', 'admin'));

router.post('/verify', asyncHandler(async (req, res) => {
  const code = String(req.body?.code || '').trim();
  if (!code) throw new HttpError(400, 'QR code or passcode is required.');
  const record = await VisitorRequest.findOne({ $or: [{ passcode: code }, { requestCode: code.toUpperCase() }] });
  if (!record) {
    await writeAudit(req, 'gate.verify', 'visitor_pass', code, 'denied', { reason: 'unknown_code' });
    throw new HttpError(404, 'Pass not found. Entry is denied.');
  }
  // Blacklisting blocks new entry, but a visitor already inside must still be able to check out.
  if (record.blacklisted && record.status !== 'Inside Campus') {
    await writeAudit(req, 'gate.verify', 'visitor_request', record.requestCode, 'denied', { reason: 'blacklisted' });
    throw new HttpError(403, 'Security alert: this visitor is blacklisted. Entry is prohibited.');
  }
  if (record.approvalStatus !== 'Approved') {
    await writeAudit(req, 'gate.verify', 'visitor_request', record.requestCode, 'denied', { reason: 'not_approved', approvalStatus: record.approvalStatus });
    throw new HttpError(403, `Entry denied: pass is ${record.approvalStatus.toLowerCase()}.`);
  }
  const today = currentCampusDate();
  const arrival = new Date(record.arrivalDate).toISOString().slice(0, 10);
  const exit = new Date(record.exitDate).toISOString().slice(0, 10);
  // Do not block an overdue visitor who is already inside from scanning out.
  if (record.status !== 'Inside Campus' && (today < arrival || today > exit)) {
    await writeAudit(req, 'gate.verify', 'visitor_request', record.requestCode, 'denied', { reason: 'outside_visit_window', today, arrival, exit });
    throw new HttpError(403, `Pass is outside its valid visit window (${arrival} to ${exit}).`);
  }
  await writeAudit(req, 'gate.verify', 'visitor_request', record.requestCode, 'success', { currentStatus: record.status });
  res.json({ item: publicVisitor(record), nextAction: record.status === 'Inside Campus' ? 'checkout' : record.status === 'Pending' ? 'checkin' : 'completed' });
}));

router.post('/:id/transition', asyncHandler(async (req, res) => {
  const action = String(req.body?.action || '');
  if (!['checkin', 'checkout'].includes(action)) throw new HttpError(400, 'Action must be checkin or checkout.');
  const record = await VisitorRequest.findOne({ requestCode: req.params.id });
  if (!record) throw new HttpError(404, 'Visitor request was not found.');
  if (record.blacklisted && action === 'checkin') throw new HttpError(403, 'Blacklisted visitors cannot enter. Contact the security admin.');
  if (record.approvalStatus !== 'Approved') throw new HttpError(403, 'Only approved passes can be used at the gate.');
  const today = currentCampusDate();
  const arrival = new Date(record.arrivalDate).toISOString().slice(0, 10);
  const exit = new Date(record.exitDate).toISOString().slice(0, 10);
  if (action === 'checkin') {
    if (record.status === 'Inside Campus') throw new HttpError(409, 'Visitor is already checked in.');
    if (record.status === 'Completed') throw new HttpError(409, 'This visit has already been completed; a new request is required.');
    if (today < arrival || today > exit) throw new HttpError(403, `Check-in is only permitted from ${arrival} through ${exit}.`);
    record.status = 'Inside Campus';
    record.checkInAt = new Date();
  } else {
    if (record.status !== 'Inside Campus') throw new HttpError(409, 'Check-out requires an active check-in.');
    record.status = 'Completed';
    record.checkOutAt = new Date();
  }
  record.activities.push({ action: action === 'checkin' ? 'gate.checkin' : 'gate.checkout', actorId: req.user._id, actorRole: req.user.role, note: action === 'checkin' ? 'Gate entry recorded after server-side verification.' : 'Gate exit recorded.' });
  await record.save();
  await writeAudit(req, action === 'checkin' ? 'gate.checkin' : 'gate.checkout', 'visitor_request', record.requestCode, 'success', { status: record.status });
  res.json({ item: publicVisitor(record) });
}));

router.get('/history', asyncHandler(async (_req, res) => {
  const records = await VisitorRequest.find({ 'activities.0': { $exists: true } }).sort({ updatedAt: -1 }).limit(300).populate('createdBy', 'name email role').lean();
  const history = records.flatMap((record) => (record.activities || []).map((activity) => ({
    requestCode: record.requestCode,
    visitorName: record.visitorName,
    passcode: record.passcode,
    action: activity.action,
    actorRole: activity.actorRole,
    timestamp: activity.timestamp,
    note: activity.note
  }))).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 500);
  res.json({ items: history });
}));

export default router;
