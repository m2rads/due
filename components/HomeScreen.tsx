import React, { useState, useEffect, useCallback } from 'react';
import { Platform, View, Text, Button } from 'react-native';
import { create, open, dismissLink, LinkSuccess, LinkExit, LinkIOSPresentationStyle, LinkLogLevel } from 'react-native-plaid-link-sdk';

const HomeScreen = ({ navigation }: any) => {
  const [linkToken, setLinkToken] = useState(null);
  const address = Platform.OS === 'ios' ? 'localhost' : '10.0.2.2';

  const createLinkToken = useCallback(async () => {
    await fetch(`http://${address}:8080/api/create_link_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ address: address })
    })
      .then((response) => response.json())
      .then((data) => {
        setLinkToken(data.link_token);
      })
      .catch((err) => {
        console.log(err);
      });
  }, [setLinkToken]);

  useEffect(() => {
    if (linkToken == null) {
      createLinkToken();
    } else {
      const tokenConfiguration = createLinkTokenConfiguration(linkToken);
      create(tokenConfiguration);
    }
  }, [linkToken]);

  const createLinkTokenConfiguration = (token: string, noLoadingState: boolean = false) => {
    return {
      token: token,
      noLoadingState: noLoadingState,
    };
  };

  const createLinkOpenProps = () => {
    return {
      onSuccess: async (success: LinkSuccess) => {
        await fetch(`http://${address}:8080/api/exchange_public_token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ public_token: success.publicToken }),
        })
          .catch((err) => {
            console.log(err);
          });
        navigation.navigate('Success', success);
      },
      onExit: (linkExit: LinkExit) => {
        console.log('Exit: ', linkExit);
        dismissLink();
      },
      iOSPresentationStyle: LinkIOSPresentationStyle.MODAL,
      logLevel: LinkLogLevel.ERROR,
    };
  };

  const handleOpenLink = () => {
    const openProps = createLinkOpenProps();
    open(openProps);
  };

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
