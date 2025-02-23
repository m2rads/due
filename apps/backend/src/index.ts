import dotenv from 'dotenv';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import authRouter from './routes/auth';
import plaidRouter from './routes/plaid';
import { logger, extractRequestInfo } from './utils/logger';

// Load environment variables
dotenv.config();

// Type declarations
declare module 'express-session' {
  interface SessionData {
    access_token?: string;
  }
}

// Initialize express app
const app = express();
const port = process.env.PORT || 8080;

// Swagger setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Due API Documentation',
      version: '1.0.0',
      description: 'API documentation for Due banking integration',
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? process.env.API_URL || 'https://api.due.com'
          : `http://localhost:${port}`,
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid'
        }
      }
    }
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// API Documentation
app.use('/api-docs', swaggerUi.serve as unknown as express.RequestHandler[]);
app.use('/api-docs', swaggerUi.setup(swaggerDocs) as unknown as express.RequestHandler);

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const reqInfo = extractRequestInfo(req);
  logger.info('Incoming request', reqInfo);
  
  // Log response
  res.on('finish', () => {
    logger.info('Response sent', {
      ...reqInfo,
      statusCode: res.statusCode,
      statusMessage: res.statusMessage
    });
  });
  
  next();
});

// Session configuration
app.use(
  (session({
    secret: process.env.SESSION_SECRET || 'bosco',
    saveUninitialized: true,
    resave: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
  }) as unknown) as express.RequestHandler
);

// Routes
app.use('/auth', authRouter);
app.use('/api', plaidRouter);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url
  });
  
  res.status(500).json({ 
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred'
  });
});

// Start server
app.listen(port, () => {
  logger.info(`Backend server is running on port ${port}...`);
}); 