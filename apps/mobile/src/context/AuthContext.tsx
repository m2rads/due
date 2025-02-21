import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Keychain from 'react-native-keychain';
import { AuthContextType, AuthState, SignInBody, SignUpBody } from '../types/auth';
import { authAPI } from '../utils/api';
import Toast from 'react-native-toast-message';

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  profile: null,
  error: null,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(initialState);

  // Check for existing session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: 'auth'
      });
      
      if (credentials) {
        const response = await authAPI.getMe();
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: response.user,
          profile: response.profile || null,
          error: null,
        });
      } else {
        setState({ ...initialState, isLoading: false });
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setState({ ...initialState, isLoading: false });
    }
  };

  const signIn = async (credentials: SignInBody) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await authAPI.signIn(credentials);
      setState({
        isAuthenticated: true,
        isLoading: false,
        user: response.user,
        profile: response.profile || null,
        error: null,
      });
      Toast.show({
        type: 'success',
        text1: 'Welcome back!',
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Sign in failed';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      Toast.show({
        type: 'error',
        text1: 'Sign In Error',
        text2: errorMessage,
      });
    }
  };

  const signUp = async (data: SignUpBody) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const response = await authAPI.signUp(data);
      setState({
        isAuthenticated: true,
        isLoading: false,
        user: response.user,
        profile: response.profile || null,
        error: null,
      });
      Toast.show({
        type: 'success',
        text1: 'Welcome to Due!',
        text2: 'Your account has been created successfully.',
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Sign up failed';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      Toast.show({
        type: 'error',
        text1: 'Sign Up Error',
        text2: errorMessage,
      });
    }
  };

  const signOut = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      await authAPI.signOut();
      setState({ ...initialState, isLoading: false });
      Toast.show({
        type: 'success',
        text1: 'Signed out successfully',
      });
    } catch (error) {
      console.error('Sign out error:', error);
      // Force sign out on error
      setState({ ...initialState, isLoading: false });
    }
  };

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  const deleteAccount = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      await authAPI.deleteAccount();
      // Clear auth state without calling signOut API endpoint
      await Keychain.resetGenericPassword({ service: 'auth' });
      setState({ ...initialState, isLoading: false });
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to delete account';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw new Error(errorMessage);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        signOut,
        clearError,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
