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
  freshlyLinked: boolean; // Track if we just linked a new account
} = {
  data: null,
  timestamp: 0,
  inProgress: false,
  pendingPromise: null,
  requestCount: 0,
  lastRequestTime: 0,
  freshlyLinked: false
};

// Increase cache lifetime to reduce API requests (120 seconds instead of 30)
const CACHE_TTL = 120 * 1000;

// Minimum time between forced refreshes (5 seconds)
const MIN_REFRESH_INTERVAL = 5000;

// Number of retry attempts for transactions after linking
const MAX_TRANSACTION_RETRIES = 3;

// Delay between retries (increasing)
const RETRY_DELAYS = [1000, 3000, 5000];

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
      // and mark that we just linked a new account
      transactionCache.freshlyLinked = true;
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
      `freshlyLinked: ${transactionCache.freshlyLinked}, ` +
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
    // BUT don't use cache if we just linked a new account
    if (!forceRefresh && 
        !transactionCache.freshlyLinked &&
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
          // If we just linked an account, use retry logic with delays
          // to allow backend time to process the new account data
          if (transactionCache.freshlyLinked) {
            console.log('[plaidService] Using retry logic for freshly linked account');
            let retryAttempt = 0;
            let lastError = null;
            
            // Try multiple times with increasing delays
            while (retryAttempt < MAX_TRANSACTION_RETRIES) {
              try {
                // Add increasing delay between retries
                if (retryAttempt > 0) {
                  console.log(`[plaidService] Retry attempt ${retryAttempt}, waiting ${RETRY_DELAYS[retryAttempt-1]}ms`);
                  await new Promise(r => setTimeout(r, RETRY_DELAYS[retryAttempt-1]));
                }
                
                const response = await api.post('/api/plaid/recurring_transactions');
                
                // Successfully got data, clear the freshly linked flag
                transactionCache.freshlyLinked = false;
                
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
                return;
              } catch (e) {
                // Safely handle different error types
                const error = e as any;
                lastError = error;
                
                // Log error details safely
                let errorStatus = 'unknown';
                try {
                  if (error.response && typeof error.response.status === 'number') {
                    errorStatus = error.response.status.toString();
                  }
                } catch (logError) {
                  console.log('[plaidService] Error accessing error details:', logError);
                }
                
                console.log(`[plaidService] Retry attempt ${retryAttempt} failed:`, errorStatus);
                
                // Check if it's a 400 error in a safe way
                let is400Error = false;
                try {
                  is400Error = error.response && error.response.status === 400;
                } catch (checkError) {
                  console.log('[plaidService] Error checking status code:', checkError);
                }
                
                // Only continue retrying for 400 errors
                if (!is400Error) {
                  break;
                }
                
                retryAttempt++;
              }
            }
            
            console.log(`[plaidService] All retry attempts failed`);
            
            // If we exhausted all retries, handle the last error
            if (lastError) {
              // Check for 400 error safely
              let is400Error = false;
              try {
                // TypeScript-safe check, convert from 'any' type to more specific structure
                const errorObj = lastError as { response?: { status?: number } };
                is400Error = !!errorObj.response && errorObj.response.status === 400;
              } catch (e) {
                console.log('[plaidService] Error checking final error status:', e);
              }
              
              // After retry attempts, return empty data for 400 errors
              if (is400Error) {
                console.log('[plaidService] Returning empty data after retry failures');
                const defaultData = [{ inflow_streams: [], outflow_streams: [] }];
                
                // Reset the freshly linked flag
                transactionCache.freshlyLinked = false;
                
                // Still cache this default response but with shorter TTL
                transactionCache.data = defaultData;
                transactionCache.timestamp = now - (CACHE_TTL / 2);
                
                resolve(defaultData);
                return;
              }
              
              throw lastError;
            }
          } else {
            // Normal non-retry request path
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
            return;
          }
        } catch (error) {
          console.error('Error getting recurring transactions:', error);
          
          // Handle 400 errors gracefully - often happens when no connections exist
          // or right after unlinking a connection
          if (error.response?.status === 400) {
            console.log('[plaidService] Received 400 error - likely no active connections');
            const defaultData = [{ inflow_streams: [], outflow_streams: [] }];
            
            // Reset the freshly linked flag
            transactionCache.freshlyLinked = false;
            
            // Still cache this default response but with shorter TTL
            transactionCache.data = defaultData;
            transactionCache.timestamp = now - (CACHE_TTL / 2); // Half the normal cache time
            
            resolve(defaultData);
            return;
          }
          
          // On other errors, we still want to keep the old cache data if available
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
      
      // As a last resort, return empty data structure instead of throwing
      console.log('[plaidService] No cache available, returning empty data');
      return [{ inflow_streams: [], outflow_streams: [] }];
    }
  }
}; 