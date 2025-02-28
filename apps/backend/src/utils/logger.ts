import winston from 'winston';
import { Request } from 'express';
import crypto from 'crypto';

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

// List of fields that should be sanitized in logs
const SENSITIVE_FIELDS = [
  // Auth-related
  'password', 'token', 'secret', 'key', 'auth', 'credential', 'api_key', 'apikey',
  'jwt', 'refresh_token', 'access_token', 'session', 'cookie', 'sessionid',
  
  // Plaid-specific
  'public_token', 'plaidAccessToken', 'plaid_token', 'plaidItemId',
  
  // Payment/financial data
  'card', 'account', 'routing', 'ssn', 'tax', 'income'
];

// Store request IDs to maintain consistent IDs across multiple log entries
const requestIdMap = new Map<string, string>();

/**
 * Generate a secure request ID for logging that doesn't expose the session ID
 * @param req Express request object
 * @returns A secure request ID for logging
 */
function getSecureRequestId(req: Request): string {
  // Generate a unique identifier for this request based on timestamp
  // We don't use IP or session info to avoid any potential security concerns
  const requestKey = Date.now().toString();
  
  // Generate a short, random request ID
  const requestId = crypto.randomBytes(4).toString('hex');
  
  // We don't need to store or reuse request IDs since we no longer tie them to requests
  return requestId;
}

// Helper to extract relevant request info for logging
export function extractRequestInfo(req: Request) {
  // Sanitize sensitive headers
  const sanitizedHeaders = sanitizeObject(
    {
      authorization: req.headers.authorization,
      cookie: req.headers.cookie,
      'user-agent': req.get('user-agent')
    },
    SENSITIVE_FIELDS
  );

  return {
    requestId: getSecureRequestId(req),
    method: req.method,
    url: req.originalUrl?.split('?')[0], // Don't log query params
    userAgent: sanitizedHeaders['user-agent'],
    ip: req.ip,
    // Only include body for certain requests, and sanitize it
    body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? 
      sanitizeObject(req.body, SENSITIVE_FIELDS) : undefined,
    // Include sanitized query parameters if they exist
    query: Object.keys(req.query).length > 0 ? 
      sanitizeObject(req.query, SENSITIVE_FIELDS) : undefined
  };
}

/**
 * Recursively sanitize an object by redacting sensitive fields
 * @param obj The object to sanitize
 * @param sensitiveFields Array of field names to sanitize
 * @returns Sanitized copy of the object
 */
export function sanitizeObject(obj: any, sensitiveFields: string[]): any {
  // Return if not an object or is null
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, sensitiveFields));
  }
  
  // For objects, create a copy to avoid modifying the original
  const sanitized = { ...obj };
  
  // Check each property in the object
  Object.keys(sanitized).forEach(key => {
    const lowerKey = key.toLowerCase();
    
    // Check if this key should be sanitized (using loose matching)
    const shouldSanitize = sensitiveFields.some(field => 
      lowerKey.includes(field.toLowerCase()));
    
    if (shouldSanitize) {
      // Redact sensitive value
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(sanitized[key], sensitiveFields);
    }
  });
  
  return sanitized;
}

// Legacy function kept for backward compatibility
function sanitizeBody(body: any) {
  return sanitizeObject(body, SENSITIVE_FIELDS);
} 