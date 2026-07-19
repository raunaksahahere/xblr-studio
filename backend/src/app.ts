import express from 'express';
import cors from 'cors';
import apiRouter from './routes/api';
import path from 'path';
import { requestLogger } from './middleware/logger';
import prisma from './config/db';

const app = express();

app.use(cors({
  origin: '*', // Allow all origins for local verification convenience
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger as any);

// Serve uploads path statically for mock PDF preview purposes
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health Check Endpoints
app.get('/health/live', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

app.get('/health/ready', async (req, res) => {
  try {
    // Probe database connectivity
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'READY',
      dependencies: {
        database: 'UP'
      },
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[HealthCheck] Readiness probe failed:', err);
    res.status(503).json({
      status: 'DOWN',
      dependencies: {
        database: 'DOWN',
        error: err.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Attach APIs Router
app.use('/api', apiRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

export default app;
