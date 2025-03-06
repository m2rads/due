import { User } from '@supabase/supabase-js';
import { SignInBody, SignUpBody, Profile } from '@due/types';
import { TransactionStream } from './calendar';

// Mobile-specific types
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  profile: Profile | null;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  signIn: (credentials: SignInBody) => Promise<void>;
  signUp: (data: SignUpBody) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearError: () => void;
}

export type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

// Tabs
export type CalendarTabParamList = {
  Calendar: { 
    transactions?: any; 
    freshlyLinked?: boolean;
    unlinked?: boolean;
    timestamp?: number;
  };
  DayDetail: { date: string; transactions: any[] };
};

export type AccountsTabParamList = {
  AddAccount: undefined;
};

// Transaction type definitions
export interface TransactionWithType extends TransactionStream {
  type: 'inflow' | 'outflow';
  id?: string; // Optional ID for operations
}

// Main tabs navigator
export type MainTabsParamList = {
  Calendar: undefined;
  AccountsTab: undefined;
  SettingsTab: undefined;
};

// Main navigator that contains both tabs and direct screens
export type MainStackParamList = {
  // Main tab container
  Main: undefined;
  
  // Tabs
  Calendar: { 
    transactions?: any; 
    freshlyLinked?: boolean;
    unlinked?: boolean;
    timestamp?: number;
  };
  AccountsTab: undefined;
  SettingsTab: undefined;
  
  // Direct screens
  DayDetail: { date: string; transactions: any[] };
  AddAccount: undefined;
};
