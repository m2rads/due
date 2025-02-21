import dotenv from 'dotenv';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import cors from 'cors';
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';
import authRouter from './routes/auth';

// Load environment variables
dotenv.config();

// Type declarations
declare module 'express-session' {
  interface SessionData {
    access_token?: string;
  }
}

interface CreateLinkTokenRequest extends Request {
  body: {
    address: string;
  }
}

interface ExchangeTokenRequest extends Request {
  body: {
    public_token: string;
  }
}

// Initialize express app
const app = express();
const router = express.Router();
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
app.use(router);

// Plaid configuration
const config = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
      'Plaid-Version': '2020-09-14',
    },
  },
});

// Instantiate Plaid client
const client = new PlaidApi(config);

// Create Link token
app.post('/api/create_link_token', async (req: CreateLinkTokenRequest, res: Response, next: NextFunction) => {
  try {
    const payload = req.body.address === 'localhost'
      ? {
          user: { client_user_id: req.sessionID },
          client_name: 'Plaid Tiny Quickstart - React Native',
          language: 'en',
          products: ['auth', 'transactions'] as Products[],
          country_codes: ['US'] as CountryCode[],
          redirect_uri: process.env.PLAID_SANDBOX_REDIRECT_URI,
        }
      : {
          user: { client_user_id: req.sessionID },
          client_name: 'Due',
          language: 'en',
          products: ['auth', 'transactions'] as Products[],
          country_codes: ['US'] as CountryCode[],
          android_package_name: process.env.PLAID_ANDROID_PACKAGE_NAME,
        };

    const tokenResponse = await client.linkTokenCreate(payload);
    res.json(tokenResponse.data);
  } catch (error) {
    next(error);
  }
});

// Exchange public token
app.post('/api/exchange_public_token', async (req: ExchangeTokenRequest, res: Response, next: NextFunction) => {
  try {
    const exchangeResponse = await client.itemPublicTokenExchange({
      public_token: req.body.public_token,
    });

    req.session.access_token = exchangeResponse.data.access_token;
    res.json(true);
  } catch (error) {
    next(error);
  }
});

// Get balance
app.post('/api/balance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const access_token = req.session.access_token;
    if (!access_token) {
      return res.status(400).json({ error: 'No access token found' });
    }

    const balanceResponse = await client.accountsBalanceGet({ access_token });
    res.json({
      Balance: balanceResponse.data,
    });
  } catch (error) {
    next(error);
  }
});

// Get recurring transactions
app.post('/api/recurring_transactions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const access_token = req.session.access_token;
    
    if (!access_token) {
      return res.status(400).json({ 
        error: 'No access token available. Please reconnect your bank account.' 
      });
    }

    const accountsResponse = await client.accountsGet({
      access_token
    });
    
    const account_ids = accountsResponse.data.accounts.map(account => account.account_id);
    
    if (!account_ids.length) {
      return res.status(400).json({ 
        error: 'No accounts found for this access token.' 
      });
    }

    const recurringResponse = await client.transactionsRecurringGet({
      access_token,
      account_ids
    });
    
    res.json({
      recurring_transactions: recurringResponse.data
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error fetching recurring transactions:', error);
      
      if ('response' in error && error.response) {
        const plaidError = error.response as { status?: number; data?: unknown };
        if (plaidError.status === 400) {
          return res.status(400).json({ 
            error: 'Invalid request to Plaid API. Please check your connection and try again.' 
          });
        }
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch recurring transactions. Please try again later.' 
    });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  console.log(`Backend server is running on port ${port}...`);
}); 