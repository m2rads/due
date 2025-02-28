import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { Calendar, PlusCircle, Settings, CreditCard } from 'lucide-react-native';
import AddAccountScreen from './screens/main/AddAccountScreen';
import CalendarView from './screens/main/CalendarView';
import DayDetailView from './screens/main/DayDetailView';
import SettingsScreen from './screens/main/SettingsScreen';
import WelcomeScreen from './screens/auth/Welcome';
import SignInScreen from './screens/auth/SignInScreen';
import SignUpScreen from './screens/auth/SignUpScreen';
import ForgotPasswordScreen from './screens/auth/ForgotPassword';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthStackParamList, MainStackParamList, MainTabsParamList } from './types/auth';
import ErrorBoundaryWrapper from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';
import SubscriptionManagement from './screens/main/SubscriptionManagement';
import SubscriptionEditor from './screens/main/SubscriptionEditor';

const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<MainTabsParamList>();

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

const screenOptions = {
  headerStyle: {
    backgroundColor: '#000000',
  },
  headerTintColor: '#fff',
  animation: 'slide_from_right' as const,
  gestureEnabled: true,
  gestureDirection: 'horizontal' as const,
  headerTitleStyle: {
    fontWeight: '600' as const,
  },
  transitionSpec: {
    open: {
      animation: 'timing',
      config: {
        duration: 300,
      },
    },
    close: {
      animation: 'timing',
      config: {
        duration: 300,
      },
    },
  },
} as const;

const tabBarOptions = {
  tabBarStyle: {
    height: 90,
  },
  tabBarItemStyle: {
    paddingVertical: 8,
  },
  tabBarActiveTintColor: '#FFFFFF',
  tabBarInactiveTintColor: '#666666',
  tabBarShowLabel: true,
  tabBarHideOnKeyboard: true,
  tabBarBackground: () => (
    <View className="flex-1 bg-black border-t border-neutral-800" />
  ),
} as const;

const AuthNavigator = () => (
  <AuthStack.Navigator
    screenOptions={screenOptions}
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

const MainNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      ...tabBarOptions,
      headerStyle: {
        backgroundColor: '#000000',
      },
      headerTintColor: '#fff',
      tabBarIcon: ({ color, size }) => {
        if (route.name === 'Calendar') {
          return (
            <View className="items-center">
              <Calendar size={24} color={color} />
              <Text className="text-xs mt-1" style={{ color }}>Calendar</Text>
            </View>
          );
        }
        if (route.name === 'Subscriptions') {
          return (
            <View className="items-center">
              <CreditCard size={24} color={color} />
              <Text className="text-xs mt-1" style={{ color }}>Subscriptions</Text>
            </View>
          );
        }
        if (route.name === 'AccountsTab') {
          return (
            <View className="items-center">
              <PlusCircle size={24} color={color} />
              <Text className="text-xs mt-1" style={{ color }}>Add Account</Text>
            </View>
          );
        }
        return (
          <View className="items-center">
            <Settings size={24} color={color} />
            <Text className="text-xs mt-1" style={{ color }}>Settings</Text>
          </View>
        );
      },
      tabBarLabel: () => null,
    })}
  >
    <Tab.Screen
      name="Calendar"
      component={CalendarView}
      options={{
        title: 'Calendar',
      }}
    />
    <Tab.Screen
      name="Subscriptions"
      component={SubscriptionManagement}
      options={{
        title: 'Subscriptions',
      }}
    />
    <Tab.Screen
      name="AccountsTab"
      component={AddAccountScreen}
      options={{
        title: 'Add Account',
      }}
    />
    <Tab.Screen
      name="SettingsTab"
      component={SettingsScreen}
      options={{
        title: 'Settings',
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
      {isAuthenticated ? (
        <MainStack.Navigator screenOptions={screenOptions}>
          <MainStack.Screen
            name="Main"
            component={MainNavigator}
            options={{ headerShown: false }}
          />
          <MainStack.Screen
            name="DayDetail"
            component={DayDetailView}
            options={{
              title: 'Daily Transactions'
            }}
          />
          <MainStack.Screen
            name="AddAccount"
            component={AddAccountScreen}
            options={{
              title: 'Add Account'
            }}
          />
          <MainStack.Screen
            name="SubscriptionEditor"
            component={SubscriptionEditor}
            options={{
              title: 'Subscription'
            }}
          />
        </MainStack.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

const App = (): React.ReactElement => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ErrorBoundaryWrapper>
            <Navigation />
            <Toast />
          </ErrorBoundaryWrapper>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;