/// <reference types="nativewind/types" />
import React, { useState, useEffect, useCallback } from 'react';
import { Platform, View, Text, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { create, open, dismissLink, LinkSuccess, LinkExit, LinkIOSPresentationStyle, LinkLogLevel } from 'react-native-plaid-link-sdk';

const AddAccountScreen = ({ navigation }: any) => {
  const [linkToken, setLinkToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const address = Platform.OS === 'ios' ? 'localhost' : '10.0.2.2';

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const createLinkToken = useCallback(async () => {
    console.log('Creating link token for platform:', Platform.OS);
    await fetch(`http://${address}:8080/api/create_link_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ address: address })
    })
      .then((response) => response.json())
      .then((data) => {
        console.log('Link token created successfully');
        setLinkToken(data.link_token);
      })
      .catch((err) => {
        console.error('Error creating link token:', err);
      });
  }, [setLinkToken]);

  const fetchRecurringTransactions = async () => {
    try {
      console.log('Fetching recurring transactions');
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
      console.log('Transactions fetched successfully');
      return data.recurring_transactions;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  };

  useEffect(() => {
    console.log('HomeScreen mounted, linkToken:', linkToken);
    if (linkToken == null) {
      createLinkToken();
    } else {
      console.log('Creating token configuration');
      const tokenConfiguration = createLinkTokenConfiguration(linkToken);
      create(tokenConfiguration);
    }
  }, [linkToken]);

  const createLinkTokenConfiguration = (token: string, noLoadingState: boolean = false) => {
    console.log('Creating token configuration with:', { token, noLoadingState });
    return {
      token: token,
      noLoadingState: noLoadingState,
    };
  };

  const createLinkOpenProps = () => {
    console.log('Creating link open props');
    return {
      onSuccess: async (success: LinkSuccess) => {
        try {
          setLoading(true);
          console.log('Plaid Link success, exchanging public token');
          await fetch(`http://${address}:8080/api/exchange_public_token`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ public_token: success.publicToken }),
          });
          console.log('Public token exchanged successfully');
          
          // Fetch recurring transactions
          const transactions = await fetchRecurringTransactions();
          console.log('Navigating to Calendar with transactions');
          // Navigate with transactions, no loading state needed
          navigation.navigate('Calendar', { 
            transactions,
            isLoading: false 
          });
        } catch (error) {
          console.error('Error in onSuccess:', error);
          // Navigate to Calendar with no transactions but not in loading state
          navigation.navigate('Calendar', { 
            transactions: null,
            isLoading: false 
          });
        } finally {
          setLoading(false);
        }
      },
      onExit: (linkExit: LinkExit) => {
        console.log('Plaid Link exit:', linkExit);
        dismissLink();
      },
      iOSPresentationStyle: LinkIOSPresentationStyle.MODAL,
      logLevel: LinkLogLevel.ERROR,
    };
  };

  const handleOpenLink = () => {
    console.log('Opening Plaid Link');
    const openProps = createLinkOpenProps();
    open(openProps);
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
    <Animated.View className="flex-1" style={{ opacity: fadeAnim }}>
      <View className="items-center px-8 justify-start bg-white pb-8">
        <Text className="text-3xl font-bold text-center mt-9 mb-4">
          Due
        </Text>
        <Text className="text-base text-gray-600 text-center mb-6">
          Connect your bank account to manage your recurring payments
        </Text>
      </View>
      <View className="flex-1 justify-end bg-white px-8 pb-8">
        <TouchableOpacity
          onPress={handleOpenLink}
          className="bg-black py-4 rounded-xl flex-row items-center justify-center"
        >
          <Text className="text-white font-semibold text-lg">Connect Bank Account</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export default AddAccountScreen;
