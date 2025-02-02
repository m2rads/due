import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './components/HomeScreen';
import CalendarView from './components/CalendarView';
import DayDetailView from './components/DayDetailView';
import AuthScreen from './components/AuthScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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

const NavigationContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <Stack.Navigator>
      {!user ? (
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{
            headerShown: false
          }}
        />
      ) : (
        <>
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
            name="Calendar"
            component={CalendarView}
            options={{
              headerStyle: {
                backgroundColor: '#000000',
              },
              headerTintColor: '#fff',
              title: 'Payment Calendar'
            }}
          />
          <Stack.Screen
            name="DayDetail"
            component={DayDetailView}
            options={{
              headerStyle: {
                backgroundColor: '#000000',
              },
              headerTintColor: '#fff',
              title: 'Daily Transactions'
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

const App = (): React.ReactElement => {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <NavigationContainer theme={PlaidTheme}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          <NavigationContent />
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthProvider>
  );
};

export default App;