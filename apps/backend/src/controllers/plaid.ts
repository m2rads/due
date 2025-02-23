import { Request, Response, NextFunction } from 'express';
import { Products, CountryCode } from 'plaid';
import { CreateLinkTokenRequest, ExchangeTokenRequest } from '../types/plaid';
import { plaidClient } from '../config/plaid';
import { AuthRequest } from '../types/auth';
import { 
  createBankConnection, 
  checkDuplicateConnection,
  getUserBankConnections,
  unlinkBankConnection 
} from '../db/queries/bank-connections';

export async function createLinkToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { address } = req.body as CreateLinkTokenRequest;
    const userId = (req as AuthRequest).user.id;
    
    const payload = address === 'localhost'
      ? {
          user: { client_user_id: userId },
          client_name: 'Plaid Tiny Quickstart - React Native',
          language: 'en',
          products: ['auth', 'transactions'] as Products[],
          country_codes: ['US'] as CountryCode[],
          redirect_uri: process.env.PLAID_SANDBOX_REDIRECT_URI,
        }
      : {
          user: { client_user_id: userId },
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
    const userId = (req as AuthRequest).user.id;
    
    // Exchange public token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    // Get institution details
    const itemResponse = await plaidClient.itemGet({
      access_token: exchangeResponse.data.access_token
    });

    const institutionId = itemResponse.data.item.institution_id;
    
    // Check for duplicate connection
    const isDuplicate = await checkDuplicateConnection(userId, institutionId!);
    if (isDuplicate) {
      return res.status(400).json({ 
        error: 'Bank account already connected' 
      });
    }

    // Create bank connection
    const connection = await createBankConnection(userId, {
      plaidAccessToken: exchangeResponse.data.access_token,
      plaidItemId: exchangeResponse.data.item_id,
      institutionId: institutionId!,
      institutionName: itemResponse.data.item.institution_id // We'll get proper name in production
    });

    res.json({
      success: true,
      connection: {
        id: connection.id,
        institutionName: connection.institutionName,
        status: connection.status
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getRecurringTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user.id;
    
    // Get user's active bank connections
    const connections = await getUserBankConnections(userId);
    
    if (!connections.length) {
      return res.status(400).json({ 
        error: 'No active bank connections found' 
      });
    }

    // Get transactions for all connections
    const allTransactions = await Promise.all(
      connections.map(async (connection) => {
        try {
          // Get accounts for this connection
          const accountsResponse = await plaidClient.accountsGet({
            access_token: connection.plaidAccessToken
          });
          
          const account_ids = accountsResponse.data.accounts.map(account => account.account_id);
          
          // Get recurring transactions
          const recurringResponse = await plaidClient.transactionsRecurringGet({
            access_token: connection.plaidAccessToken,
            account_ids
          });
          
          return recurringResponse.data;
        } catch (error) {
          console.error(`Error fetching transactions for connection ${connection.id}:`, error);
          return null;
        }
      })
    );

    // Filter out failed requests and combine transactions
    const validTransactions = allTransactions.filter(t => t !== null);
    
    res.json({
      recurring_transactions: validTransactions
    });
  } catch (error) {
    next(error);
  }
}

export async function getBankConnections(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user.id;
    const connections = await getUserBankConnections(userId);
    
    res.json({
      connections: connections.map(conn => ({
        id: conn.id,
        institutionName: conn.institutionName,
        status: conn.status,
        itemStatus: conn.itemStatus,
        lastStatusUpdate: conn.lastStatusUpdate
      }))
    });
  } catch (error) {
    next(error);
  }
}

export async function unlinkBank(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user.id;
    const { connectionId } = req.params;
    
    await unlinkBankConnection(userId, connectionId);
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}