import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import authRoutes from './routes/auth.routes.js';
import requestRoutes from './routes/requests.routes.js';
import gateRoutes from './routes/gate.routes.js';
import auditRoutes from './routes/audit.routes.js';
import { HttpError } from './utils/httpError.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.clientOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS configuration.'));
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
if (config.nodeEnv !== 'test') app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 1200, standardHeaders: 'draft-8', legacyHeaders: false }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'GateWay API', timestamp: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/gate', gateRoutes);
app.use('/api/audit', auditRoutes);
app.use((_req, _res, next) => next(new HttpError(404, 'API endpoint not found.')));
app.use((err, _req, res, _next) => {
  if (err?.code === 11000) return res.status(409).json({ message: 'A record with this unique identifier already exists. Please retry.' });
  if (err?.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE' ? `Document exceeds the ${Math.floor(config.maxFileSize / 1024 / 1024)} MB upload limit.` : err.message;
    return res.status(400).json({ message });
  }
  if (err.message === 'Origin is not allowed by CORS configuration.') return res.status(403).json({ message: err.message });
  const status = Number(err.status) || 500;
  if (status >= 500) console.error(err.stack || err.message);
  res.status(status).json({ message: status >= 500 ? 'Unexpected server error.' : err.message, ...(err.details ? { details: err.details } : {}) });
});

export default app;
