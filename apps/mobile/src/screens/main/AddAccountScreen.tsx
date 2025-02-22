/// <reference types="nativewind/types" />
import React, { useState, useEffect } from 'react';
import { Platform, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { create, open, dismissLink, LinkSuccess, LinkExit, LinkIOSPresentationStyle, LinkLogLevel } from 'react-native-plaid-link-sdk';

const AddAccountScreen = ({ navigation }: any) => {
  const [linkToken, setLinkToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const address = Platform.OS === 'ios' ? 'localhost' : '10.0.2.2';

  useEffect(() => {
    // Initial Plaid Link setup
    createAndConfigureLink();

    return () => {
      dismissLink();
    };
  }, []);

  const createAndConfigureLink = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://${address}:8080/api/create_link_token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ address: address })
      });

      if (!response.ok) {
        throw new Error('Failed to create link token');
      }

      const data = await response.json();
      
      // Configure Plaid Link with new token
      await create({
        token: data.link_token,
        noLoadingState: false,
      });
      
      setLinkToken(data.link_token);
    } catch (err) {
      console.error('Error creating/configuring link:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecurringTransactions = async () => {
    try {
      const response = await fetch(`http://${address}:8080/api/recurring_transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();
      return data.recurring_transactions;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  };

  const handleOpenLink = async () => {
    try {
      if (!linkToken) {
        await createAndConfigureLink();
      }

      const openProps = {
        onSuccess: async (success: LinkSuccess) => {
          try {
            setLoading(true);
            const exchangeResponse = await fetch(`http://${address}:8080/api/exchange_public_token`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ public_token: success.publicToken }),
            });

            if (!exchangeResponse.ok) {
              throw new Error('Failed to exchange public token');
            }

            const transactions = await fetchRecurringTransactions();
            navigation.navigate('Calendar', { 
              transactions,
              isLoading: false 
            });
          } catch (error) {
            console.error('Error in onSuccess:', error);
            navigation.navigate('Calendar', { 
              transactions: null,
              isLoading: false 
            });
          } finally {
            setLoading(false);
          }
        },
        onExit: async (linkExit: LinkExit) => {
          if (linkExit?.error?.errorCode) {
            console.error('Plaid Link error:', linkExit.error);
          }
          await dismissLink();
          setLinkToken(null);
          await createAndConfigureLink();
        },
        iOSPresentationStyle: LinkIOSPresentationStyle.MODAL,
        logLevel: Platform.OS === 'ios' ? LinkLogLevel.ERROR : LinkLogLevel.DEBUG,
      };

      await open(openProps);
    } catch (error) {
      console.error('Error opening Plaid Link:', error);
      await dismissLink();
      setLinkToken(null);
      await createAndConfigureLink();
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#000000" />
        <Text className="mt-3 text-gray-600">Loading your transactions...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="items-center px-8 pt-9">
        <Text className="text-3xl font-bold text-black text-center mb-4">
          Due
        </Text>
        <Text className="text-base text-gray-600 text-center mb-6">
          Connect your bank account to manage your recurring payments
        </Text>
      </View>
      <View className="flex-1 justify-end px-8 pb-8">
        <TouchableOpacity
          onPress={handleOpenLink}
          disabled={loading}
          className="bg-black py-4 rounded-xl flex-row items-center justify-center"
        >
          <Text className="text-white font-semibold text-lg">
            Connect Bank Account
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default AddAccountScreen;
