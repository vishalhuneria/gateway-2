import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

export const config = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gateway',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean),
  uploadDir: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', process.env.UPLOAD_DIR || 'uploads'),
  maxFileSize: Math.max(1, Number(process.env.MAX_FILE_SIZE_MB || 5)) * 1024 * 1024,
  nodeEnv: process.env.NODE_ENV || 'development'
};

if (!config.jwtSecret || config.jwtSecret.length < 32 || config.jwtSecret.includes('replace-with-')) {
  if (config.nodeEnv === 'production') throw new Error('JWT_SECRET must be set to a random string of at least 32 characters in production.');
  config.jwtSecret = 'development-only-secret-change-before-deployment-2026';
  console.warn('WARNING: Using development JWT secret. Set JWT_SECRET in server/.env before deployment.');
}
