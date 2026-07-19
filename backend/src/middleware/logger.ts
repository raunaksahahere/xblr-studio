import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface TraceableRequest extends Request {
  correlationId?: string;
}

export const requestLogger = (
  req: TraceableRequest,
  res: Response,
  next: NextFunction
) => {
  const correlationId = (req.headers['x-correlation-id'] as string) || crypto.randomUUID();
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  const startTime = Date.now();

  // Log Request Start
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'REQUEST_START',
    correlationId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  }));

  // Intercept Response to log execution metrics
  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'REQUEST_COMPLETE',
      correlationId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs
    }));
  });

  next();
};
