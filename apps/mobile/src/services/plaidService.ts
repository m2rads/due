import api from '../utils/api';
import { BankConnection } from '@due/types';
import { LinkSuccessMetadata, LinkInstitution } from 'react-native-plaid-link-sdk';

export type PlaidLinkMetadata = LinkSuccessMetadata;

// Transaction cache to prevent duplicate requests
let transactionCache: {
  data: any | null;
  timestamp: number;
  inProgress: boolean;
  pendingPromise: Promise<any> | null;
  requestCount: number; // Add counter for debugging
  lastRequestTime: number; // Track time of last request
} = {
  data: null,
  timestamp: 0,
  inProgress: false,
  pendingPromise: null,
  requestCount: 0,
  lastRequestTime: 0
};

// Increase cache lifetime to reduce API requests (120 seconds instead of 30)
const CACHE_TTL = 120 * 1000;

// Minimum time between forced refreshes (5 seconds)
const MIN_REFRESH_INTERVAL = 5000;

export const plaidService = {
  async createLinkToken(address: string) {
    try {
      const response = await api.post('/api/plaid/create_link_token', { address });
      
      if (!response.data?.link_token) {
        console.error('Create link token response missing token:', response.data);
        throw new Error('Failed to create link token');
      }
      
      return response.data.link_token;
    } catch (error) {
      console.error('Error creating link token:', error);
      throw error;
    }
  },

  async exchangePublicToken(publicToken: string, metadata: PlaidLinkMetadata) {
    if (!metadata.institution) {
      throw new Error('Institution data is required');
    }

    try {
      const response = await api.post('/api/plaid/exchange_public_token', {
        public_token: publicToken,
        institutionId: metadata.institution.id,
        institutionName: metadata.institution.name
      });
      
      if (!response.data?.connection) {
        console.error('Exchange token response missing connection:', response.data);
        throw new Error('Failed to connect bank account');
      }
      
      // Invalidate transaction cache when adding a new connection
      this.invalidateTransactionCache();
      
      return response.data.connection as BankConnection;
    } catch (error) {
      console.error('Error exchanging public token:', error);
      
      if (error.response?.status === 409) {
        throw new Error('This bank account is already connected');
      }
      
      throw error;
    }
  },

  async getBankConnections() {
    try {
      const response = await api.get('/api/plaid/bank-connections');
      return response.data.connections as BankConnection[];
    } catch (error) {
      console.error('Error getting bank connections:', error);
      
      // Don't treat 404 as error - just means no connections yet
      if (error.response?.status === 404) {
        return [];
      }
      
      throw error;
    }
  },

  async unlinkBankConnection(connectionId: string, reason?: string) {
    try {
      await api.delete(`/api/plaid/bank-connections/${connectionId}`, {
        data: { reason }
      });
      
      // Invalidate transaction cache when removing a connection
      this.invalidateTransactionCache();
      
      return true;
    } catch (error) {
      console.error(`Error unlinking bank connection ${connectionId}:`, error);
      throw error;
    }
  },
  
  // Clear the transaction cache
  invalidateTransactionCache() {
    console.log('[plaidService] Invalidating transaction cache');
    transactionCache.data = null;
    transactionCache.timestamp = 0;
    // Reset counters on invalidation
    transactionCache.requestCount = 0;
  },

  async getRecurringTransactions(forceRefresh = false) {
    // Track requests for debugging
    const now = Date.now();
    transactionCache.requestCount++;
    const timeSinceLastRequest = now - transactionCache.lastRequestTime;
    transactionCache.lastRequestTime = now;
    
    // Log request patterns to help debug
    console.log(
      `[plaidService] Transaction request #${transactionCache.requestCount}, ` +
      `${timeSinceLastRequest}ms since last request, ` +
      `forceRefresh: ${forceRefresh}, ` +
      `inProgress: ${transactionCache.inProgress}`
    );
    
    // Check if we have a valid cached result
    const cacheAge = now - transactionCache.timestamp;
    
    // Prevent force refreshes that are too frequent
    if (forceRefresh && timeSinceLastRequest < MIN_REFRESH_INTERVAL && transactionCache.data) {
      console.log(`[plaidService] Ignoring force refresh, too soon (${timeSinceLastRequest}ms)`);
      forceRefresh = false;
    }
    
    // Return cached data if it's fresh enough and not forcing refresh
    if (!forceRefresh && 
        transactionCache.data && 
        cacheAge < CACHE_TTL) {
      console.log('[plaidService] Returning cached transactions, age:', cacheAge, 'ms');
      return transactionCache.data;
    }
    
    // If there's already a request in progress, return that promise
    if (transactionCache.inProgress && transactionCache.pendingPromise) {
      console.log('[plaidService] Reusing in-progress transaction request');
      return transactionCache.pendingPromise;
    }
    
    // Otherwise make a new request
    try {
      console.log('[plaidService] Fetching fresh transactions from API');
      
      // Mark that a request is in progress
      transactionCache.inProgress = true;
      
      // Create the promise for the API call
      const fetchPromise = new Promise(async (resolve, reject) => {
        try {
          const response = await api.post('/api/plaid/recurring_transactions');
          
          if (!response.data?.recurring_transactions) {
            console.warn('Recurring transactions response missing data:', response.data);
            const defaultData = [{ inflow_streams: [], outflow_streams: [] }];
            
            // Cache the default response
            transactionCache.data = defaultData;
            transactionCache.timestamp = Date.now();
            
            resolve(defaultData);
            return;
          }
          
          // Cache the successful response
          transactionCache.data = response.data.recurring_transactions;
          transactionCache.timestamp = Date.now();
          
          resolve(response.data.recurring_transactions);
        } catch (error) {
          console.error('Error getting recurring transactions:', error);
          
          // On error, we still want to keep the old cache data if available
          if (transactionCache.data) {
            console.log('[plaidService] Keeping existing cache data after error');
            resolve(transactionCache.data);
          } else {
            reject(error);
          }
        } finally {
          // Mark that the request is complete
          transactionCache.inProgress = false;
          transactionCache.pendingPromise = null;
        }
      });
      
      // Store the promise so parallel calls can use it
      transactionCache.pendingPromise = fetchPromise;
      
      return fetchPromise;
    } catch (error) {
      console.error('Error in transaction request wrapper:', error);
      
      // Reset in-progress flag on error
      transactionCache.inProgress = false;
      transactionCache.pendingPromise = null;
      
      // Return cached data if available, even if stale
      if (transactionCache.data) {
        console.log('[plaidService] Returning stale cache after error');
        return transactionCache.data;
      }
      
      throw error;
    }
  }
}; 