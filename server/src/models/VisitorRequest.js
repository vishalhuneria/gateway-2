import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  storedName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true }
}, { _id: false });

const activitySchema = new mongoose.Schema({
  action: { type: String, required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actorRole: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  note: { type: String, default: '' }
}, { _id: false });

const visitorRequestSchema = new mongoose.Schema({
  requestCode: { type: String, required: true, unique: true, index: true },
  passcode: { type: String, required: true, unique: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  hostRole: { type: String, enum: ['student', 'faculty'], required: true },
  visitorName: { type: String, required: true, trim: true, maxlength: 120 },
  visitorEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  idType: { type: String, enum: ['Aadhaar Card', 'Passport'], required: true },
  idNumber: { type: String, default: '' },
  idDocument: { type: documentSchema, default: null },
  hostName: { type: String, required: true, trim: true, maxlength: 120 },
  hostEmail: { type: String, required: true, trim: true, lowercase: true },
  hostAddress: { type: String, required: true, trim: true, maxlength: 240 },
  hostIdDocType: { type: String, required: true, trim: true },
  hostDocument: { type: documentSchema, default: null },
  purpose: { type: String, required: true, enum: ['Personal / Guest', 'Academic Collaboration', 'Courier / Delivery', 'Facility Maintenance'] },
  arrivalDate: { type: Date, required: true },
  exitDate: { type: Date, required: true },
  durationDays: { type: Number, required: true, min: 1 },
  approvalStatus: { type: String, enum: ['Pending Approval', 'Approved', 'Rejected'], default: 'Pending Approval', index: true },
  rejectionReason: { type: String, default: '' },
  status: { type: String, enum: ['Pending', 'Inside Campus', 'Completed'], default: 'Pending', index: true },
  checkInAt: { type: Date, default: null },
  checkOutAt: { type: Date, default: null },
  blacklisted: { type: Boolean, default: false, index: true },
  blacklistedAt: { type: Date, default: null },
  blacklistedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  activities: { type: [activitySchema], default: [] }
}, { timestamps: true, versionKey: false });

visitorRequestSchema.index({ visitorName: 'text', visitorEmail: 'text', hostName: 'text', hostAddress: 'text' });
export default mongoose.model('VisitorRequest', visitorRequestSchema);
