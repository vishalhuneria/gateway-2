import { Router } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import VisitorRequest from '../models/VisitorRequest.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { visitorDocumentsUpload } from '../middleware/upload.js';
import { config } from '../config.js';
import { HttpError, asyncHandler } from '../utils/httpError.js';
import { writeAudit } from '../utils/audit.js';
import { publicVisitor } from '../utils/visitorView.js';

const router = Router();
router.use(authenticate);

const purposes = ['Personal / Guest', 'Academic Collaboration', 'Courier / Delivery', 'Facility Maintenance'];
const dateString = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
const dateForStorage = (value) => new Date(`${value}T00:00:00.000Z`);
function daysInclusive(start, end) { return Math.floor((dateForStorage(end) - dateForStorage(start)) / 86400000) + 1; }
function currentCampusDate() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
async function newPasscode() {
  for (let i = 0; i < 60; i += 1) {
    const value = String(crypto.randomInt(1000, 10000));
    if (!(await VisitorRequest.exists({ passcode: value }))) return value;
  }
  throw new HttpError(503, 'Could not allocate a unique passcode. Try again.');
}
function fileMetadata(file) {
  return file ? { originalName: file.originalname, storedName: file.filename, mimeType: file.mimetype, size: file.size } : null;
}
async function removeUploadedFiles(files) {
  const all = Object.values(files || {}).flat();
  await Promise.all(all.map((file) => fs.unlink(file.path).catch(() => {})));
}

router.get('/stats', requireRoles('admin', 'guard'), asyncHandler(async (req, res) => {
  const match = {};
  const [total, pending, approved, rejected, inside, blacklisted, purposeRows, hostRows] = await Promise.all([
    VisitorRequest.countDocuments(match),
    VisitorRequest.countDocuments({ approvalStatus: 'Pending Approval' }),
    VisitorRequest.countDocuments({ approvalStatus: 'Approved' }),
    VisitorRequest.countDocuments({ approvalStatus: 'Rejected' }),
    VisitorRequest.countDocuments({ status: 'Inside Campus' }),
    VisitorRequest.countDocuments({ blacklisted: true }),
    VisitorRequest.aggregate([{ $group: { _id: '$purpose', count: { $sum: 1 } } }]),
    VisitorRequest.aggregate([{ $group: { _id: '$hostRole', count: { $sum: 1 } } }])
  ]);
  res.json({ total, pending, approved, rejected, inside, blacklisted, purposes: purposeRows, hostTypes: hostRows });
}));

router.get('/', asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'student' || req.user.role === 'faculty') filter.createdBy = req.user._id;
  else if (!['admin', 'guard'].includes(req.user.role)) throw new HttpError(403, 'You cannot view visitor requests.');
  const status = String(req.query.status || '').trim();
  const search = String(req.query.search || '').trim();
  if (['Pending Approval', 'Approved', 'Rejected'].includes(status)) filter.approvalStatus = status;
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { visitorName: { $regex: escaped, $options: 'i' } },
      { visitorEmail: { $regex: escaped, $options: 'i' } },
      { hostName: { $regex: escaped, $options: 'i' } },
      { hostAddress: { $regex: escaped, $options: 'i' } },
      { passcode: { $regex: escaped, $options: 'i' } },
      { requestCode: { $regex: escaped, $options: 'i' } }
    ];
  }
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 200));
  const records = await VisitorRequest.find(filter).populate('createdBy', 'name email role entryNumber').sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ items: records.map(publicVisitor) });
}));

router.post('/', requireRoles('student', 'faculty'), visitorDocumentsUpload, asyncHandler(async (req, res) => {
  try {
    const body = req.body || {};
    const visitorName = String(body.visitorName || '').trim();
    const visitorEmail = String(body.visitorEmail || '').trim().toLowerCase();
    const idType = String(body.idType || '');
    const rawIdNumber = String(body.idNumber || '').trim();
    const hostName = String(body.hostName || '').trim();
    const hostAddress = String(body.hostAddress || '').trim();
    const hostIdDocType = String(body.hostIdDocType || '').trim();
    const arrivalDate = String(body.arrivalDate || '');
    const exitDate = String(body.exitDate || '');
    const purpose = String(body.purpose || 'Personal / Guest');

    if (visitorName.length < 2 || visitorName.length > 120) throw new HttpError(400, 'Visitor name must be between 2 and 120 characters.');
    if (!/^\S+@\S+\.\S+$/.test(visitorEmail)) throw new HttpError(400, 'Enter a valid visitor email.');
    if (idType === 'Aadhaar Card' && !/^\d{12}$/.test(rawIdNumber)) throw new HttpError(400, 'Aadhaar number must contain exactly 12 digits.');
    if (idType === 'Passport' && !/^[A-Za-z]\d{7}$/.test(rawIdNumber)) throw new HttpError(400, 'Passport number must be one letter followed by seven digits.');
    if (!['Aadhaar Card', 'Passport'].includes(idType)) throw new HttpError(400, 'Select a supported visitor ID type.');
    if (hostName.length < 2 || hostAddress.length < 2 || !hostIdDocType) throw new HttpError(400, 'Host name, host address, and host ID type are required.');
    if (!dateString(arrivalDate) || !dateString(exitDate)) throw new HttpError(400, 'Valid arrival and departure dates are required.');
    if (exitDate < arrivalDate) throw new HttpError(400, 'Departure date cannot be earlier than arrival date.');
    if (arrivalDate < currentCampusDate()) throw new HttpError(400, 'Arrival date cannot be in the past.');
    if (!purposes.includes(purpose)) throw new HttpError(400, 'Select a valid visit purpose.');

    const requestCode = `VIS-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const passcode = await newPasscode();
    const files = req.files || {};
    if (!files.visitorDocument?.[0] || !files.hostDocument?.[0]) {
      throw new HttpError(400, 'Upload both the visitor identity document and the host identity document.');
    }
    const record = await VisitorRequest.create({
      requestCode,
      passcode,
      createdBy: req.user._id,
      hostRole: req.user.role,
      visitorName,
      visitorEmail,
      idType,
      // Aadhaar is not stored as clear text. Passport is stored for this prototype and should be protected/encrypted in production.
      idNumber: idType === 'Aadhaar Card' ? '' : rawIdNumber.toUpperCase(),
      idDocument: fileMetadata(files.visitorDocument?.[0]),
      hostName,
      hostEmail: req.user.email,
      hostAddress,
      hostIdDocType,
      hostDocument: fileMetadata(files.hostDocument?.[0]),
      purpose,
      arrivalDate: dateForStorage(arrivalDate),
      exitDate: dateForStorage(exitDate),
      durationDays: daysInclusive(arrivalDate, exitDate),
      activities: [{ action: 'request.created', actorId: req.user._id, actorRole: req.user.role, note: 'Visitor request submitted for review.' }]
    });
    await writeAudit(req, 'request.created', 'visitor_request', record.requestCode, 'success', { purpose, durationDays: record.durationDays });
    res.status(201).json({ item: publicVisitor(record) });
  } catch (error) {
    await removeUploadedFiles(req.files);
    throw error;
  }
}));

router.patch('/:id/decision', requireRoles('admin'), asyncHandler(async (req, res) => {
  const decision = String(req.body?.decision || '');
  const reason = String(req.body?.reason || '').trim().slice(0, 500);
  if (!['approve', 'reject'].includes(decision)) throw new HttpError(400, 'Decision must be approve or reject.');
  if (decision === 'reject' && reason.length < 3) throw new HttpError(400, 'Provide a rejection reason of at least 3 characters.');
  const record = await VisitorRequest.findOne({ requestCode: req.params.id });
  if (!record) throw new HttpError(404, 'Visitor request was not found.');
  if (record.approvalStatus !== 'Pending Approval') throw new HttpError(409, 'Only pending requests can be approved or rejected.');
  record.approvalStatus = decision === 'approve' ? 'Approved' : 'Rejected';
  record.rejectionReason = decision === 'reject' ? reason : '';
  record.activities.push({ action: decision === 'approve' ? 'request.approved' : 'request.rejected', actorId: req.user._id, actorRole: req.user.role, note: decision === 'reject' ? reason : 'Request approved by security admin.' });
  await record.save();
  await writeAudit(req, `request.${decision === 'approve' ? 'approved' : 'rejected'}`, 'visitor_request', record.requestCode, 'success', decision === 'reject' ? { reason } : {});
  res.json({ item: publicVisitor(record) });
}));

router.patch('/:id/blacklist', requireRoles('admin'), asyncHandler(async (req, res) => {
  const record = await VisitorRequest.findOne({ requestCode: req.params.id });
  if (!record) throw new HttpError(404, 'Visitor request was not found.');
  if (record.status === 'Inside Campus' && req.body?.blacklisted === false) {
    // Unblocking is allowed, but does not change physical gate state.
  }
  record.blacklisted = typeof req.body?.blacklisted === 'boolean' ? req.body.blacklisted : !record.blacklisted;
  record.blacklistedAt = record.blacklisted ? new Date() : null;
  record.blacklistedBy = record.blacklisted ? req.user._id : null;
  record.activities.push({ action: record.blacklisted ? 'visitor.blacklisted' : 'visitor.unblacklisted', actorId: req.user._id, actorRole: req.user.role, note: record.blacklisted ? 'Blocked by security admin.' : 'Blacklist flag removed by security admin.' });
  await record.save();
  await writeAudit(req, record.blacklisted ? 'visitor.blacklisted' : 'visitor.unblacklisted', 'visitor_request', record.requestCode);
  res.json({ item: publicVisitor(record) });
}));

router.get('/:id/documents/:kind', requireRoles('admin'), asyncHandler(async (req, res) => {
  const kind = req.params.kind;
  if (!['visitor', 'host'].includes(kind)) throw new HttpError(400, 'Document type must be visitor or host.');
  const record = await VisitorRequest.findOne({ requestCode: req.params.id }).select('+idNumber');
  if (!record) throw new HttpError(404, 'Visitor request was not found.');
  const doc = kind === 'visitor' ? record.idDocument : record.hostDocument;
  if (!doc) throw new HttpError(404, 'No document was uploaded for this field.');
  const fullPath = path.resolve(config.uploadDir, doc.storedName);
  if (!fullPath.startsWith(`${config.uploadDir}${path.sep}`)) throw new HttpError(400, 'Invalid document path.');
  try { await fs.access(fullPath); } catch { throw new HttpError(404, 'Uploaded document is no longer available on this server.'); }
  await writeAudit(req, 'document.viewed', 'visitor_request', record.requestCode, 'success', { kind });
  res.setHeader('Content-Type', doc.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${doc.originalName.replace(/[\r\n"\\]/g, '_')}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  res.sendFile(fullPath);
}));

export { currentCampusDate };
export default router;
