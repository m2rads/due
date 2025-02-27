import { Request, Response, NextFunction } from 'express';
import { Products, CountryCode } from 'plaid';
import { CreateLinkTokenRequest, ExchangeTokenRequest, UnlinkBankRequest } from '../types/plaid';
import { plaidClient } from '../config/plaid';
import { 
  createBankConnection,
  getUserBankConnections,
  updateBankConnection,
  unlinkBankConnection as unlinkBank,
  checkDuplicateConnection,
  findSoftDeletedConnection,
  reactivateBankConnection
} from '../db/queries/bank-connections';
import { logger, extractRequestInfo } from '../utils/logger';
import { AuthRequest } from '../types/auth';

const PLAID_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;

interface PlaidError extends Error {
  response?: {
    status: number;
    data?: {
      error_message?: string;
    };
  };
}

interface PlaidResponse<T> {
  data: T;
}

function isPlaidError(error: unknown): error is PlaidError {
  return error instanceof Error && 'response' in error;
}

async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: PlaidError | Error = new Error('Unknown error');
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return await Promise.race([
        operation(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('TIMEOUT')), PLAID_TIMEOUT)
        )
      ]) as T;
    } catch (error) {
      if (error instanceof Error) {
        lastError = error;
        if (error.message === 'TIMEOUT' || 
            (isPlaidError(error) && error.response && 
             (error.response.status >= 500 || error.response.status === 429))) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
          continue;
        }
      }
      throw lastError;
    }
  }
  throw lastError;
}

export async function createLinkToken(req: Request, res: Response, next: NextFunction) {
  const reqInfo = extractRequestInfo(req);
  logger.info('Creating Plaid link token', { ...reqInfo });
  
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
    logger.info('Successfully created Plaid link token', { ...reqInfo });
    res.json(tokenResponse.data);
  } catch (error) {
    logger.error('Failed to create Plaid link token', { 
      ...reqInfo, 
      error: isPlaidError(error) ? error.response?.data?.error_message : error 
    });
    next(error);
  }
}

export async function exchangePublicToken(req: Request, res: Response, next: NextFunction) {
  const reqInfo = extractRequestInfo(req);
  logger.info('Exchanging Plaid public token', { ...reqInfo });
  
  try {
    const { public_token, institutionId, institutionName } = req.body as ExchangeTokenRequest;
    const userId = (req as AuthRequest).user.id;
    
    // First check if there's an active connection
    const hasDuplicate = await checkDuplicateConnection(userId, institutionId);
    if (hasDuplicate) {
      logger.warn('Duplicate bank connection attempt', { 
        ...reqInfo, 
        institutionId 
      });
      return res.status(409).json({ 
        error: 'DUPLICATE_CONNECTION',
        message: 'Bank account already connected' 
      });
    }

    // Exchange the public token with Plaid
    const exchangeResponse = await withRetry(() => 
      plaidClient.itemPublicTokenExchange({ public_token })
    ) as PlaidResponse<{
      access_token: string;
      item_id: string;
    }>;

    // Look for a soft-deleted connection for this institution
    const softDeletedConnection = await findSoftDeletedConnection(userId, institutionId);

    let connection;
    if (softDeletedConnection) {
      // Reactivate the existing connection with the new access token
      logger.info('Reactivating soft-deleted bank connection', { 
        ...reqInfo, 
        connectionId: softDeletedConnection.id,
        institutionId 
      });
      
      connection = await reactivateBankConnection(softDeletedConnection.id, {
        plaidAccessToken: exchangeResponse.data.access_token,
        plaidItemId: exchangeResponse.data.item_id
      });
      
      logger.info('Successfully reactivated bank connection', { 
        ...reqInfo, 
        connectionId: connection.id,
        institutionId 
      });
    } else {
      // Create a new connection
      connection = await createBankConnection(userId, {
        plaidAccessToken: exchangeResponse.data.access_token,
        plaidItemId: exchangeResponse.data.item_id,
        institutionId,
        institutionName
      });
      
      logger.info('Successfully created bank connection', { 
        ...reqInfo, 
        connectionId: connection.id,
        institutionId 
      });
    }

    req.session.access_token = exchangeResponse.data.access_token;
    res.json({ success: true, connection });
  } catch (error) {
    if (isPlaidError(error)) {
      logger.error('Failed to exchange Plaid token', { 
        ...reqInfo, 
        error: error.response?.data?.error_message 
      });
      return res.status(400).json({ 
        error: 'PLAID_EXCHANGE_ERROR',
        message: 'Failed to connect bank account',
        details: error.response?.data?.error_message 
      });
    }
    
    // Handle database errors specifically
    if (error instanceof Error && error.message.includes('uuid')) {
      logger.error('Database UUID error during bank connection', {
        ...reqInfo,
        error: error.message
      });
      return res.status(500).json({
        error: 'DATABASE_ERROR',
        message: 'Failed to create bank connection'
      });
    }

    logger.error('Unexpected error during token exchange', { 
      ...reqInfo, 
      error 
    });
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
    const userId = (req as AuthRequest).user.id;
    const connections = await getUserBankConnections(userId);
    
    if (!connections.length) {
      return res.status(400).json({ 
        error: 'NO_ACTIVE_CONNECTIONS',
        message: 'No active bank connections found' 
      });
    }

    const allTransactions = await Promise.all(
      connections.map(async (connection) => {
        try {
          const accountsResponse = await plaidClient.accountsGet({
            access_token: connection.plaidAccessToken
          });
          
          const account_ids = accountsResponse.data.accounts.map(account => account.account_id);
          
          const recurringResponse = await plaidClient.transactionsRecurringGet({
            access_token: connection.plaidAccessToken,
            account_ids
          });
          
          // Add institutionId and institutionName to each transaction stream
          const data = recurringResponse.data;
          
          // Add connection info to each inflow stream
          if (data.inflow_streams && Array.isArray(data.inflow_streams)) {
            data.inflow_streams = data.inflow_streams.map(stream => ({
              ...stream,
              institutionId: connection.id,
              institutionName: connection.institutionName
            }));
          }
          
          // Add connection info to each outflow stream
          if (data.outflow_streams && Array.isArray(data.outflow_streams)) {
            data.outflow_streams = data.outflow_streams.map(stream => ({
              ...stream,
              institutionId: connection.id,
              institutionName: connection.institutionName
            }));
          }
          
          return data;
        } catch (error) {
          // Update connection status if there's an error
          if (error instanceof Error && 'response' in error) {
            const plaidError = error.response as { status?: number; data?: any };
            await updateBankConnection(connection.id, {
              itemStatus: 'error',
              errorCode: plaidError.data?.error_code,
              errorMessage: plaidError.data?.error_message,
              lastStatusUpdate: new Date()
            });
          }
          return null;
        }
      })
    );

    const validTransactions = allTransactions.filter(t => t !== null);
    
    if (!validTransactions.length) {
      return res.json({
        recurring_transactions: [{
          inflow_streams: [],
          outflow_streams: []
        }]
      });
    }

    res.json({
      recurring_transactions: validTransactions
    });
  } catch (error) {
    next(error);
  }
}

export async function getBankConnections(req: Request, res: Response, next: NextFunction) {
  const reqInfo = extractRequestInfo(req);
  logger.info('Fetching bank connections', { ...reqInfo });
  
  try {
    const userId = (req as AuthRequest).user.id;
    const connections = await getUserBankConnections(userId);
    res.json({ connections: connections || [] });
  } catch (error) {
    if (error instanceof Error && error.message.includes('database')) {
      logger.error('Database error fetching bank connections', { 
        ...reqInfo, 
        error: error.message 
      });
      return res.status(500).json({ 
        error: 'DATABASE_ERROR',
        message: 'Failed to fetch bank connections'
      });
    }
    
    logger.warn('Non-critical error fetching bank connections', { 
      ...reqInfo, 
      error: isPlaidError(error) ? error.response?.data?.error_message : error 
    });
    res.json({ connections: [] });
  }
}

export async function unlinkBankConnection(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthRequest).user.id;
    const { id } = req.params;
    const { reason } = req.body as UnlinkBankRequest;
    
    await unlinkBank(userId, id, reason);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}