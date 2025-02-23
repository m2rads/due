import { Request, Response, NextFunction } from 'express';
import { Products, CountryCode } from 'plaid';
import { CreateLinkTokenRequest, ExchangeTokenRequest } from '../types/plaid';
import { plaidClient } from '../config/plaid';

export async function createLinkToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { address } = req.body as CreateLinkTokenRequest;
    
    const payload = address === 'localhost'
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

    const tokenResponse = await plaidClient.linkTokenCreate(payload);
    res.json(tokenResponse.data);
  } catch (error) {
    next(error);
  }
}

export async function exchangePublicToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { public_token } = req.body as ExchangeTokenRequest;
    
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    req.session.access_token = exchangeResponse.data.access_token;
    res.json(true);
  } catch (error) {
    next(error);
  }
}

export async function getBalance(req: Request, res: Response, next: NextFunction) {
  try {
    const access_token = req.session.access_token;
    if (!access_token) {
      return res.status(400).json({ error: 'No access token found' });
    }

    const balanceResponse = await plaidClient.accountsBalanceGet({ access_token });
    res.json({
      Balance: balanceResponse.data,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRecurringTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const access_token = req.session.access_token;
    
    if (!access_token) {
      return res.status(400).json({ 
        error: 'No access token available. Please reconnect your bank account.' 
      });
    }

    const accountsResponse = await plaidClient.accountsGet({
      access_token
    });
    
    const account_ids = accountsResponse.data.accounts.map(account => account.account_id);
    
    if (!account_ids.length) {
      return res.status(400).json({ 
        error: 'No accounts found for this access token.' 
      });
    }

    const recurringResponse = await plaidClient.transactionsRecurringGet({
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
}