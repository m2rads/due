/// <reference types="nativewind/types" />
import React, { useState, useEffect } from 'react';
import { Platform, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { create, open, dismissLink, LinkSuccess, LinkExit, LinkIOSPresentationStyle, LinkLogLevel } from 'react-native-plaid-link-sdk';
import Toast from 'react-native-toast-message';
import { BankConnection } from '@due/types';
import { plaidService, PlaidLinkMetadata } from '../../services/plaidService';
import BankConnectionsList from '../../components/BankConnectionsList';
import { useAuth } from '../../context/AuthContext';

interface ConnectionState {
  isConnecting: boolean;
  isLoading: boolean;
  error: string | null;
}

const AddAccountScreen = ({ navigation }: any) => {
  const { isAuthenticated } = useAuth();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnecting: false,
    isLoading: true,
    error: null
  });

  // Cancel any ongoing Plaid processes when component unmounts
  useEffect(() => {
    if (isAuthenticated) {
      loadConnections();
    }
    return () => {
      try {
        dismissLink();
      } catch (e) {
        // Ignore errors on dismiss during unmount
      }
    };
  }, [isAuthenticated]);

  const loadConnections = async () => {
    if (!isAuthenticated) {
      setConnectionState(prev => ({ 
        ...prev, 
        error: 'Please sign in to connect your bank account',
        isLoading: false 
      }));
      return;
    }

    try {
      setConnectionState(prev => ({ ...prev, isLoading: true, error: null }));
      const connections = await plaidService.getBankConnections();
      setConnections(connections || []);
      setConnectionState(prev => ({ ...prev, isLoading: false }));
    } catch (error: any) {
      // Only show error toast for unexpected errors
      if (error.response?.status !== 404) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load bank connections'
        });
        setConnectionState(prev => ({ 
          ...prev, 
          error: error.message || 'Failed to load bank connections',
          isLoading: false 
        }));
      } else {
        // 404 just means no connections yet, not an error state
        setConnections([]);
        setConnectionState(prev => ({ ...prev, isLoading: false }));
      }
    }
  };

  const createAndConfigureLink = async (): Promise<string | null> => {
    if (!isAuthenticated) {
      setConnectionState(prev => ({ 
        ...prev, 
        error: 'Please sign in to connect your bank account',
        isConnecting: false 
      }));
      return null;
    }

    try {
      // Get a link token from the backend
      const token = await plaidService.createLinkToken(
        Platform.OS === 'ios' ? 'localhost' : '10.0.2.2'
      );
      
      if (!token) {
        setConnectionState(prev => ({ 
          ...prev, 
          error: 'Unable to initialize bank connection',
          isConnecting: false 
        }));
        return null;
      }

      // Create the Plaid Link configuration
      await create({
        token,
        noLoadingState: false,
      });
      
      return token;
    } catch (err: any) {
      console.error('Error creating link:', err);
      const errorMessage = err.response?.status === 404 
        ? 'Bank connection service is unavailable'
        : err.message || 'Failed to initialize bank connection';
        
      setConnectionState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isConnecting: false 
      }));
      
      // Show an error toast for better visibility
      Toast.show({
        type: 'error',
        text1: 'Connection Error',
        text2: errorMessage
      });
      
      return null;
    }
  };

  const handleExchangeToken = async (publicToken: string, metadata: PlaidLinkMetadata) => {
    try {
      console.log('Exchanging public token with metadata for institution:', 
        metadata.institution?.name || 'Unknown');
      
      const connection = await plaidService.exchangePublicToken(publicToken, metadata);
      
      // Add new connection to our local state
      setConnections(prev => {
        // Replace connection if it already exists (for reconnects)
        const existingIndex = prev.findIndex(c => 
          c.institutionId === metadata.institution?.id
        );
        
        if (existingIndex >= 0) {
          const newConnections = [...prev];
          newConnections[existingIndex] = connection;
          return newConnections;
        }
        
        // Otherwise add as new connection
        return [...prev, connection];
      });
      
      return connection;
    } catch (error: any) {
      console.error('Error exchanging token:', error);
      
      if (error.response?.status === 409) {
        throw new Error('This bank account is already connected');
      }
      
      throw new Error(error.message || 'Failed to connect bank account');
    }
  };

  const handleOpenLink = async () => {
    try {
      // Dismiss any existing link before starting new one
      try {
        await dismissLink();
      } catch (e) {
        // Ignore dismiss errors
        console.log('Dismiss error (expected):', e);
      }
      
      setConnectionState(prev => ({ ...prev, isConnecting: true, error: null }));
      
      // Always create a new link token and configure
      const token = await createAndConfigureLink();
      if (!token) {
        // Error is already set by createAndConfigureLink
        return;
      }
      setLinkToken(token);

      const openProps = {
        onSuccess: async (success: LinkSuccess) => {
          try {
            if (!success.metadata.institution) {
              throw new Error('Failed to get institution data');
            }

            console.log('Plaid Link success for:', success.metadata.institution.name);
            
            // First mark connecting as complete to update UI
            setConnectionState(prev => ({ ...prev, isConnecting: false, error: null }));
            
            // Show a temporary success toast
            Toast.show({
              type: 'success',
              text1: 'Connecting Bank',
              text2: `Connecting ${success.metadata.institution.name}...`
            });
            
            // Exchange the public token for permanent credentials
            const connection = await handleExchangeToken(success.publicToken, success.metadata);
            
            // Show final success message
            Toast.show({
              type: 'success',
              text1: 'Bank Connected',
              text2: `Successfully connected ${success.metadata.institution.name}`
            });

            // Navigate back to calendar with a fresh flag, but don't try to pre-load transactions
            // Let the Calendar component handle that to avoid race conditions
            // Add a small delay to ensure all state updates have completed
            setTimeout(() => {
              navigation.navigate('Calendar', {
                freshlyLinked: true,
                timestamp: Date.now() // Force refresh even if navigating to the same screen
              });
            }, 300);
          } catch (error: any) {
            console.error('Error handling Plaid success:', error);
            const errorMessage = error.message || 'Failed to complete bank connection';
            
            Toast.show({
              type: 'error',
              text1: 'Connection Error',
              text2: errorMessage
            });
            
            setConnectionState(prev => ({ 
              ...prev, 
              error: errorMessage,
              isConnecting: false
            }));
          }
        },
        onExit: async (linkExit: LinkExit) => {
          const hasError = !!linkExit?.error;
          const errorMessage = linkExit?.error?.displayMessage || 'Connection cancelled';
          
          console.log('Plaid Link exit:', hasError ? errorMessage : 'User cancelled');
          
          if (hasError) {
            Toast.show({
              type: 'error',
              text1: 'Connection Error',
              text2: errorMessage
            });
          }
          
          setConnectionState(prev => ({ 
            ...prev, 
            error: hasError ? errorMessage : null,
            isConnecting: false
          }));
          
          // Clean up and prepare for next attempt
          try {
            await dismissLink();
          } catch (e) {
            // Ignore dismiss errors
          }
          setLinkToken(null);
        },
        iOSPresentationStyle: LinkIOSPresentationStyle.MODAL,
        logLevel: __DEV__ ? LinkLogLevel.DEBUG : LinkLogLevel.ERROR,
      };

      console.log('Opening Plaid Link...');
      await open(openProps);
    } catch (error: any) {
      console.error('Error opening Plaid Link:', error);
      const errorMessage = error.message || 'Failed to initialize bank connection';
      
      Toast.show({
        type: 'error',
        text1: 'Connection Error',
        text2: errorMessage
      });
      
      setConnectionState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isConnecting: false 
      }));
      
      // Clean up on error
      try {
        await dismissLink();
      } catch (e) {
        // Ignore dismiss errors
      }
      setLinkToken(null);
    }
  };

  const handleUnlink = async (connection: BankConnection) => {
    try {
      console.log('Unlinking bank connection:', connection.id, connection.institutionName);
      
      // First update the local state immediately before API call
      // This ensures UI is responsive and any checks for active connections
      // will reflect the removal immediately
      setConnections(prev => prev.filter(c => c.id !== connection.id));
      
      // Show toast to indicate operation is in progress
      Toast.show({
        type: 'info',
        text1: 'Unlinking Bank',
        text2: `Unlinking ${connection.institutionName}...`
      });
      
      // Then make the API call
      await plaidService.unlinkBankConnection(connection.id, 'user_requested');
      
      // Make sure to properly invalidate transaction cache
      plaidService.invalidateTransactionCache();
      
      // Show success toast after unlink completes
      Toast.show({
        type: 'success',
        text1: 'Bank Unlinked',
        text2: `Successfully unlinked ${connection.institutionName}`
      });
      
      // Add longer delay to ensure backend processes the unlink fully before navigation
      // This helps prevent the 400 error when fetching transactions
      const navigationTimeoutRef = setTimeout(() => {
        // Navigate to Calendar with unlinked flag to trigger refresh
        navigation.navigate('Calendar', {
          unlinked: true,
          timestamp: Date.now() // Force refresh
        });
      }, 2000); // Increased delay significantly to allow backend to process unlink
      
      // Clean up timeout if component unmounts
      return () => clearTimeout(navigationTimeoutRef);
    } catch (error: any) {
      console.error('Error unlinking bank:', error);
      
      // Restore the connection in local state if API call failed
      loadConnections();
      
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to unlink bank account'
      });
    }
  };

  const handleReconnect = async (connection: BankConnection) => {
    console.log('Attempting to reconnect bank account:', connection.id);
    await handleOpenLink();
  };

  if (connectionState.isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#333333" />
        <Text className="text-gray-700 font-medium mt-4">Loading your connections...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      {connections.length > 0 ? (
        <>
          <BankConnectionsList
            connections={connections}
            isRefreshing={connectionState.isLoading}
            onRefresh={loadConnections}
            onReconnect={handleReconnect}
            onUnlink={handleUnlink}
          />
          
          {/* Add button to connect another account */}
          <View className="px-4 py-4 bg-white shadow-md border-t border-gray-200">
            <TouchableOpacity
              onPress={handleOpenLink}
              disabled={connectionState.isConnecting}
              className={`py-3 px-4 rounded-lg flex-row justify-center items-center ${
                connectionState.isConnecting ? 'bg-gray-300' : 'bg-gray-800'
              }`}
            >
              {connectionState.isConnecting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white font-medium">
                  Connect Another Account
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View className="flex-1 px-6 pt-10">
          <View className="bg-white rounded-xl shadow-md overflow-hidden">
            <View className="bg-gray-800 px-5 py-4">
              <Text className="text-white font-semibold text-lg text-center">
                Connect Bank Account
              </Text>
            </View>
            
            <View className="p-6">
              <Text className="text-2xl font-bold text-gray-800 text-center mb-3">
                Due
              </Text>
              <Text className="text-gray-600 text-center mb-6">
                Connect your bank account to manage your recurring payments
              </Text>
              
              {connectionState.error && (
                <View className="bg-red-50 rounded-lg p-4 mb-6">
                  <Text className="text-red-600 text-center">
                    {connectionState.error}
                  </Text>
                </View>
              )}
              
              <TouchableOpacity
                onPress={handleOpenLink}
                disabled={connectionState.isConnecting}
                className={`py-3 rounded-lg flex-row justify-center items-center ${
                  connectionState.isConnecting ? 'bg-gray-300' : 'bg-gray-800'
                }`}
              >
                {connectionState.isConnecting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-medium">
                    Connect Bank Account
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default AddAccountScreen;
