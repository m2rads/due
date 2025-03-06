import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
import { AuthStackParamList, MainStackParamList, MainTabsParamList } from './types/auth';
import ErrorBoundaryWrapper from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';

const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<MainTabsParamList>();

const PlaidTheme = {
  dark: false,
  colors: {
    primary: '#000000',
    background: '#F9FAFB',
    card: '#FFFFFF',
    text: '#000000',
    border: '#E5E7EB',
    notification: '#EF4444',
  },
};

const screenOptions = {
  headerStyle: {
    backgroundColor: '#FFFFFF',
  },
  headerTintColor: '#000000',
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
    height: 70,
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E5E7EB',
  },
  tabBarItemStyle: {
    paddingVertical: 8,
  },
  tabBarActiveTintColor: '#000000',
  tabBarInactiveTintColor: '#9CA3AF',
  tabBarShowLabel: false,
  tabBarHideOnKeyboard: true,
  tabBarBackground: () => (
    <View className="flex-1 bg-white border-t border-gray-200" />
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
      headerShown: false,
      tabBarIcon: ({ color, size }) => {
        if (route.name === 'Calendar') {
          return <Calendar size={26} color={color} />;
        }
        if (route.name === 'AccountsTab') {
          return <PlusCircle size={26} color={color} />;
        }
        return <Settings size={26} color={color} />;
      },
      tabBarLabel: () => null,
    })}
  >
    <Tab.Screen
      name="Calendar"
      component={CalendarView}
    />
    <Tab.Screen
      name="AccountsTab"
      component={AddAccountScreen}
    />
    <Tab.Screen
      name="SettingsTab"
      component={SettingsScreen}
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {isAuthenticated ? (
        <MainStack.Navigator 
          screenOptions={{
            ...screenOptions,
            headerShown: false,
          }}
        >
          <MainStack.Screen
            name="Main"
            component={MainNavigator}
          />
          <MainStack.Screen
            name="DayDetail"
            component={DayDetailView}
          />
          <MainStack.Screen
            name="AddAccount"
            component={AddAccountScreen}
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