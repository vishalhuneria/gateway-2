import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { config } from '../config.js';
import { HttpError } from '../utils/httpError.js';

fs.mkdirSync(config.uploadDir, { recursive: true });
const allowed = new Map([
  ['image/jpeg', '.jpg'],
  ['application/pdf', '.pdf']
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploadDir),
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${allowed.get(file.mimetype) || '.bin'}`)
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxFileSize, files: 2 },
  fileFilter: (_req, file, cb) => {
    if (!allowed.has(file.mimetype)) return cb(new HttpError(415, 'Only JPG, JPEG, and PDF documents are accepted.'));
    cb(null, true);
  }
});

export const visitorDocumentsUpload = upload.fields([
  { name: 'visitorDocument', maxCount: 1 },
  { name: 'hostDocument', maxCount: 1 }
]);
