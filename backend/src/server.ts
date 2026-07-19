import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app';
import { initSocket } from './services/socketService';
import { startWorker } from './queues/worker';
import redisClient from './config/redis';

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Start BullMQ processing worker only if Redis connects
redisClient.on('connect', () => {
  try {
    startWorker();
    console.log('[Server] BullMQ worker initialized.');
  } catch (err) {
    console.error('[Server] Failed to start BullMQ worker:', err);
  }
});

redisClient.on('error', () => {
  console.log('[Server] Redis offline. Background processing will run via MemoryQueue.');
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  AI XBRL Studio Backend Running on Port ${PORT}`);
  console.log(`  Mode: STANDALONE MODE (SQLite & MemoryQueue active)`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=======================================================`);
});
