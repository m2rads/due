import winston from 'winston';
import { Request } from 'express';

const { combine, timestamp, json, errors } = winston.format;

// Configure log format based on environment
const logFormat = combine(
  errors({ stack: true }),
  timestamp(),
  json()
);

// Create the logger
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'due-backend' },
  transports: [
    // Write to all logs with level 'info' and below to 'combined.log'
    // Write all logs error (and below) to 'error.log'.
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// If we're not in production, log to the console with color
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
} else {
  // In production (Railway), just log to stdout
  logger.add(new winston.transports.Console({
    format: logFormat
  }));
}

// Helper to extract relevant request info for logging
export function extractRequestInfo(req: Request) {
  return {
    requestId: req.sessionID,
    method: req.method,
    url: req.url,
    userAgent: req.get('user-agent'),
    ip: req.ip,
    body: req.method === 'POST' ? sanitizeBody(req.body) : undefined
  };
}

// Sanitize sensitive data from request body
function sanitizeBody(body: any) {
  const sanitized = { ...body };
  const sensitiveFields = ['public_token', 'plaidAccessToken', 'access_token'];
  
  sensitiveFields.forEach(field => {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
} 