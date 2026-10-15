export function publicVisitor(request) {
  const v = typeof request.toObject === 'function' ? request.toObject() : request;
  const host = v.createdBy && typeof v.createdBy === 'object' ? v.createdBy : null;
  const doc = (d) => d ? { fileName: d.originalName, mimeType: d.mimeType, size: d.size } : null;
  return {
    _id: String(v._id),
    id: v.requestCode,
    requestCode: v.requestCode,
    passcode: v.passcode,
    name: v.visitorName,
    email: v.visitorEmail,
    idType: v.idType,
    idNumber: v.idType === 'Aadhaar Card' ? '[Aadhaar Redacted]' : v.idNumber,
    idDocName: v.idDocument?.originalName || '',
    hasVisitorDocument: Boolean(v.idDocument),
    hostName: v.hostName,
    hostEmail: v.hostEmail,
    hostAddress: v.hostAddress,
    hostIdDocType: v.hostIdDocType,
    hostDocName: v.hostDocument?.originalName || '',
    hasHostDocument: Boolean(v.hostDocument),
    purpose: v.purpose,
    arrivalDate: v.arrivalDate ? new Date(v.arrivalDate).toISOString().slice(0, 10) : '',
    exitDate: v.exitDate ? new Date(v.exitDate).toISOString().slice(0, 10) : '',
    durationDays: v.durationDays,
    approvalStatus: v.approvalStatus,
    rejectionReason: v.rejectionReason || '',
    status: v.status,
    checkInTime: v.checkInAt ? new Date(v.checkInAt).toLocaleString('en-GB') : '—',
    checkOutTime: v.checkOutAt ? new Date(v.checkOutAt).toLocaleString('en-GB') : '—',
    checkInAt: v.checkInAt || null,
    checkOutAt: v.checkOutAt || null,
    requestTimestamp: v.createdAt ? new Date(v.createdAt).toLocaleString('en-GB') : '',
    blacklisted: Boolean(v.blacklisted),
    visitHistory: (v.activities || []).map((a) => ({ action: a.action, timestamp: a.timestamp, note: a.note, actorRole: a.actorRole })),
    createdBy: host ? { id: String(host._id), name: host.name || '', email: host.email, role: host.role } : String(v.createdBy),
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
    visitorDocument: doc(v.idDocument),
    hostDocument: doc(v.hostDocument)
  };
}
