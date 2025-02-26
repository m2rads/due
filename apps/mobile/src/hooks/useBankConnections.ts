import { useState, useEffect, useCallback, useRef } from 'react';
import { BankConnection } from '@due/types';
import { plaidService } from '../services/plaidService';
import Toast from 'react-native-toast-message';

interface BankConnectionsState {
  connections: BankConnection[];
  isLoading: boolean;
  isRefreshing: boolean;
  hasError: boolean;
}

export function useBankConnections() {
  const [state, setState] = useState<BankConnectionsState>({
    connections: [],
    isLoading: true,
    isRefreshing: false,
    hasError: false
  });
  
  // Use a ref to prevent duplicate loading
  const isLoadingRef = useRef(false);
  const lastLoadTimeRef = useRef(0);
  
  // Throttle connection loading - don't reload if we loaded recently
  const shouldLoadConnections = useCallback(() => {
    const now = Date.now();
    const timeSinceLastLoad = now - lastLoadTimeRef.current;
    
    // Only allow reloading every 5 seconds (unless forced)
    if (timeSinceLastLoad < 5000 && lastLoadTimeRef.current !== 0) {
      console.log('[useBankConnections] Skipping load, too soon since last load:', 
        timeSinceLastLoad, 'ms');
      return false;
    }
    
    if (isLoadingRef.current) {
      console.log('[useBankConnections] Skipping load, already loading');
      return false;
    }
    
    return true;
  }, []);

  const loadConnections = useCallback(async (showToast = true, force = false) => {
    if (!force && !shouldLoadConnections()) {
      return;
    }
    
    try {
      isLoadingRef.current = true;
      setState(prev => ({ ...prev, isLoading: true, hasError: false }));
      
      const connections = await plaidService.getBankConnections();
      lastLoadTimeRef.current = Date.now();
      
      setState(prev => ({ 
        ...prev, 
        connections,
        isLoading: false
      }));
    } catch (error) {
      console.error('[useBankConnections] Failed to load connections:', error);
      setState(prev => ({ ...prev, hasError: true }));
      
      if (showToast) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load bank connections'
        });
      }
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
      isLoadingRef.current = false;
    }
  }, [shouldLoadConnections]);

  const refreshConnections = useCallback(async () => {
    // Always allow refreshing, but prevent duplicate refresh operations
    if (isLoadingRef.current) {
      console.log('[useBankConnections] Skipping refresh, already loading');
      return;
    }
    
    try {
      isLoadingRef.current = true;
      setState(prev => ({ ...prev, isRefreshing: true }));
      
      const connections = await plaidService.getBankConnections();
      lastLoadTimeRef.current = Date.now();
      
      setState(prev => ({ 
        ...prev, 
        connections,
        hasError: false
      }));
    } catch (error) {
      console.error('[useBankConnections] Failed to refresh connections:', error);
      setState(prev => ({ ...prev, hasError: true }));
      
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to refresh connections'
      });
    } finally {
      setState(prev => ({ ...prev, isRefreshing: false }));
      isLoadingRef.current = false;
    }
  }, []);

  // Memoize these to prevent recreating functions on every render
  const hasActiveConnections = useCallback(() => {
    return state.connections.some(
      conn => conn.status === 'active' && conn.itemStatus !== 'error'
    );
  }, [state.connections]);

  const getErroredConnections = useCallback(() => {
    return state.connections.filter(
      conn => conn.status === 'inactive' || conn.itemStatus === 'error'
    );
  }, [state.connections]);

  // Only load on initial mount
  useEffect(() => {
    loadConnections(false, true);
    
    // Cleanup
    return () => {
      isLoadingRef.current = false;
    };
  }, []);

  return {
    ...state,
    loadConnections,
    refreshConnections,
    hasActiveConnections,
    getErroredConnections
  };
} 