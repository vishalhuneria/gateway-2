import mongoose from 'mongoose';
import app from './app.js';
import { config } from './config.js';

if (!config.mongoUri) throw new Error('MONGODB_URI is required. Set it in server/.env.');

try {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
  const server = app.listen(config.port, () => console.log(`GateWay API listening on http://localhost:${config.port}`));
  const shutdown = async (signal) => {
    console.log(`${signal} received; shutting down.`);
    server.close(async () => { await mongoose.disconnect(); process.exit(0); });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
} catch (error) {
  console.error('Could not connect to MongoDB:', error.message);
  process.exit(1);
}
