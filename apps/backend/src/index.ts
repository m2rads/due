import dotenv from 'dotenv';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import cors from 'cors';
import authRouter from './routes/auth';
import plaidRouter from './routes/plaid';

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

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

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
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  console.log(`Backend server is running on port ${port}...`);
}); 