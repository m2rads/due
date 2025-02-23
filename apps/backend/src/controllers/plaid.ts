import { Request, Response, NextFunction } from 'express';
import { Products, CountryCode } from 'plaid';
import { CreateLinkTokenRequest, ExchangeTokenRequest, UnlinkBankRequest } from '../types/plaid';
import { plaidClient } from '../config/plaid';
import { 
  createBankConnection,
  getUserBankConnections,
  updateBankConnection,
  unlinkBankConnection as unlinkBank,
  checkDuplicateConnection 
} from '../db/queries/bank-connections';

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
    const { public_token, institutionId, institutionName } = req.body as ExchangeTokenRequest;
    
    // Check for duplicate connection
    const hasDuplicate = await checkDuplicateConnection(req.sessionID, institutionId);
    if (hasDuplicate) {
      return res.status(409).json({ 
        error: 'DUPLICATE_CONNECTION',
        message: 'Bank account already connected' 
      });
    }

    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    // Save the connection in database
    const connection = await createBankConnection(req.sessionID, {
      plaidAccessToken: exchangeResponse.data.access_token,
      plaidItemId: exchangeResponse.data.item_id,
      institutionId,
      institutionName
    });

    req.session.access_token = exchangeResponse.data.access_token;
    res.json({ success: true, connection });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error exchanging token:', error);
      if ('response' in error) {
        return res.status(400).json({ 
          error: 'PLAID_EXCHANGE_ERROR',
          message: 'Failed to connect bank account' 
        });
      }
    }
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
    const userId = req.sessionID;
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
          
          return recurringResponse.data;
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
      return res.status(400).json({ 
        error: 'NO_VALID_TRANSACTIONS',
        message: 'Could not fetch transactions from any connected bank' 
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
  try {
    const connections = await getUserBankConnections(req.sessionID);
    res.json({ connections });
  } catch (error) {
    next(error);
  }
}

export async function unlinkBankConnection(req: Request<{ id: string }, unknown, UnlinkBankRequest>, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    await unlinkBank(req.sessionID, id, reason);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}