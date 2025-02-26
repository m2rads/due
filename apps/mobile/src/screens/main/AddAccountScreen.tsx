/// <reference types="nativewind/types" />
import React, { useState, useEffect } from 'react';
import { Platform, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0FFF0', // Very light green background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0FFF0', // Very light green background
  },
  loadingText: {
    fontSize: 14,
    color: '#004400', // Dark green text
    marginTop: 12,
  },
  windowContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderWidth: 1,
    borderColor: '#004400', // Dark green border
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#004400',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  windowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#88AA88', // Medium green header
    borderBottomWidth: 1,
    borderBottomColor: '#004400',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  windowTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#004400', // Dark green text
    textAlign: 'center',
    flex: 1,
  },
  windowButtons: {
    flexDirection: 'row',
    position: 'absolute',
    left: 8,
  },
  closeButton: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF5F57',
    borderWidth: 1,
    borderColor: '#E33E32',
    marginRight: 6,
  },
  minimizeButton: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFBD2E',
    borderWidth: 1,
    borderColor: '#E09E1A',
    marginRight: 6,
  },
  expandButton: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#28CA42',
    borderWidth: 1,
    borderColor: '#17A62E',
  },
  emptyStateContainer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F8FFF8', // Very light green background
  },
  titleText: {
    fontSize: 18,
    fontWeight: '600', 
    color: '#004400', // Dark green text
    textAlign: 'center',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#004400', // Dark green text with opacity
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#8B0000', // Dark red for errors
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#E8F5E8', // Light green background
    borderTopWidth: 1,
    borderTopColor: '#B0D2B0',
  },
  connectButton: {
    backgroundColor: '#88AA88', // Medium green button
    borderWidth: 1,
    borderColor: '#004400', // Dark green border
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 0,
    alignItems: 'center',
  },
  connectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF', // White text
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
    borderWidth: 1,
    borderColor: '#999999',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 0,
    alignItems: 'center',
  },
});

// Simple 90s window close button
const WindowHeader = ({ title }: { title: string }) => (
  <View style={styles.windowHeader}>
    <View style={styles.windowButtons}>
      <View style={styles.closeButton} />
      <View style={styles.minimizeButton} />
      <View style={styles.expandButton} />
    </View>
    <Text style={styles.windowTitle}>{title}</Text>
  </View>
);

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
            const connection = await handleExchangeToken(success.publicToken, success.metadata);
            
            Toast.show({
              type: 'success',
              text1: 'Bank Connected',
              text2: `Successfully connected ${success.metadata.institution.name}`
            });

            // First mark connection as complete
            setConnectionState(prev => ({ ...prev, isConnecting: false, error: null }));

            // Navigate back to calendar with a fresh flag, but don't try to pre-load transactions
            // Let the Calendar component handle that to avoid race conditions
            navigation.navigate('CalendarTab', { 
              screen: 'Calendar',
              params: {
                freshlyLinked: true,
                timestamp: Date.now() // Force refresh even if navigating to the same screen
              }
            });
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
      await plaidService.unlinkBankConnection(connection.id, 'user_requested');
      
      // Update local state immediately
      setConnections(prev => prev.filter(c => c.id !== connection.id));
      
      Toast.show({
        type: 'success',
        text1: 'Bank Unlinked',
        text2: `Successfully unlinked ${connection.institutionName}`
      });
      
      // Navigate to Calendar with unlinked flag to trigger refresh
      navigation.navigate('CalendarTab', {
        screen: 'Calendar',
        params: {
          unlinked: true,
          timestamp: Date.now() // Force refresh
        }
      });
    } catch (error: any) {
      console.error('Error unlinking bank:', error);
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loadingText}>Loading your connections...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {connections.length > 0 ? (
        <BankConnectionsList
          connections={connections}
          isRefreshing={connectionState.isLoading}
          onRefresh={loadConnections}
          onReconnect={handleReconnect}
          onUnlink={handleUnlink}
        />
      ) : (
        <View style={styles.windowContainer}>
          <WindowHeader title="Connect Bank Account" />
          
          <View style={styles.emptyStateContainer}>
            <Text style={styles.titleText}>
              Due
            </Text>
            <Text style={styles.descriptionText}>
              Connect your bank account to manage your recurring payments
            </Text>
            {connectionState.error && (
              <Text style={styles.errorText}>
                {connectionState.error}
              </Text>
            )}
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={handleOpenLink}
              disabled={connectionState.isConnecting}
              style={connectionState.isConnecting ? styles.disabledButton : styles.connectButton}
            >
              {connectionState.isConnecting ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.connectButtonText}>
                  Connect Bank Account
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

export default AddAccountScreen;
