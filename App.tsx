import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SuccessScreen from './components/SuccessScreen';
import HomeScreen from './components/HomeScreen';
import "./global.css"

const Stack = createNativeStackNavigator();

const PlaidTheme = {
  dark: false,
  colors: {
    primary: '#FFFFFF',
    background: '#000000',
    card: '#FFFFFF',
    text: '#000000',
    border: '#000000',
    notification: '#FFFFFF',
  },
};

const App = (): React.ReactElement => {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={PlaidTheme}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <Stack.Navigator>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              headerStyle: {
                backgroundColor: '#000000',
              },
              headerTintColor: '#fff',
            }}
          />
          <Stack.Screen
            name="Success"
            component={SuccessScreen}
            options={{
              headerStyle: {
                backgroundColor: '#000000',
              },
              headerTintColor: '#fff',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;