import React, { useState, useEffect, useCallback } from 'react';
import { Platform, View, Text, Button, ActivityIndicator } from 'react-native';
import { create, open, dismissLink, LinkSuccess, LinkExit, LinkIOSPresentationStyle, LinkLogLevel } from 'react-native-plaid-link-sdk';

const HomeScreen = ({ navigation }: any) => {
  const [linkToken, setLinkToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const address = Platform.OS === 'ios' ? 'localhost' : '10.0.2.2';

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
          navigation.navigate('Calendar', { transactions });
        } catch (error) {
          console.error('Error in onSuccess:', error);
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={{ marginTop: 12 }}>Loading your transactions...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{
        alignItems: 'center',
        paddingHorizontal: 32,
        justifyContent: 'flex-start',
        backgroundColor: '#FFFFFF',
        paddingBottom: 32,
      }}>
        <Text style={{
          fontSize: 28,
          fontWeight: 'bold',
          textAlign: 'center',
          marginTop: 36,
          marginHorizontal: 10,
        }}>
          Due
        </Text>
      </View>
      <View style={{
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 32,
        paddingBottom: 32,
      }}>
        <Button
          title="Connect Bank Account"
          onPress={handleOpenLink}
        />
      </View>
    </View>
  );
};

export default HomeScreen;
