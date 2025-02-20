import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Calendar, PlusCircle, Settings } from 'lucide-react-native';
import AddAccountScreen from './screens/main/AddAccountScreen';
import CalendarView from './screens/main/CalendarView';
import DayDetailView from './screens/main/DayDetailView';
import SettingsScreen from './screens/main/SettingsScreen';
import WelcomeScreen from './screens/auth/Welcome';
import SignInScreen from './screens/auth/SignInScreen';
import SignUpScreen from './screens/auth/SignUpScreen';
import ForgotPasswordScreen from './screens/auth/ForgotPassword';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthStackParamList, MainStackParamList } from './types/auth';
import ErrorBoundaryWrapper from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';

const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator();

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

const AuthNavigator = () => (
  <AuthStack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#000000',
      },
      headerTintColor: '#fff',
    }}
  >
    <AuthStack.Screen 
      name="Welcome" 
      component={WelcomeScreen}
      options={{ headerShown: false }}
    />
    <AuthStack.Screen 
      name="SignIn" 
      component={SignInScreen}
      options={{ title: 'Sign In' }}
    />
    <AuthStack.Screen 
      name="SignUp" 
      component={SignUpScreen}
      options={{ title: 'Sign Up' }}
    />
    <AuthStack.Screen 
      name="ForgotPassword" 
      component={ForgotPasswordScreen}
      options={{ title: 'Reset Password' }}
    />
  </AuthStack.Navigator>
);

const CalendarStack = () => (
  <MainStack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#000000',
      },
      headerTintColor: '#fff',
    }}
  >
    <MainStack.Screen
      name="Calendar"
      component={CalendarView}
      options={{
        title: 'Payment Calendar'
      }}
    />
    <MainStack.Screen
      name="DayDetail"
      component={DayDetailView}
      options={{
        title: 'Daily Transactions'
      }}
    />
  </MainStack.Navigator>
);

const MainNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarStyle: {
        backgroundColor: '#000000',
        borderTopColor: '#333333',
      },
      tabBarActiveTintColor: '#FFFFFF',
      tabBarInactiveTintColor: '#666666',
      headerStyle: {
        backgroundColor: '#000000',
      },
      headerTintColor: '#fff',
    }}
  >
    <Tab.Screen
      name="CalendarTab"
      component={CalendarStack}
      options={{
        headerShown: false,
        title: 'Calendar',
        tabBarIcon: ({ color, size }) => (
          <Calendar size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="AddAccountTab"
      component={AddAccountScreen}
      options={{
        title: 'Add Account',
        tabBarIcon: ({ color, size }) => (
          <PlusCircle size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="SettingsTab"
      component={SettingsScreen}
      options={{
        title: 'Settings',
        tabBarIcon: ({ color, size }) => (
          <Settings size={size} color={color} />
        ),
      }}
    />
  </Tab.Navigator>
);

const Navigation = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer theme={PlaidTheme}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

const App = (): React.ReactElement => {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ErrorBoundaryWrapper>
          <Navigation />
          <Toast />
        </ErrorBoundaryWrapper>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App;