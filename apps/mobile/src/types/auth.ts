import { User } from '@supabase/supabase-js';
import { SignInBody, SignUpBody, Profile } from '@due/types';

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

// Transaction and subscription type definitions
export interface TransactionWithType {
  type: 'inflow' | 'outflow';
  id?: string;
  description: string;
  merchant_name: string;
  average_amount: { amount: number };
  frequency: string;
  category: string[];
  last_date: string;
  predicted_next_date: string;
  is_active: boolean;
  status: string;
  institutionId?: string;
  institutionName?: string;
}

// Main tabs navigator
export type MainTabsParamList = {
  Calendar: undefined;
  Subscriptions: undefined;
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
  Subscriptions: undefined;
  AccountsTab: undefined;
  SettingsTab: undefined;
  
  // Direct screens
  DayDetail: { date: string; transactions: any[] };
  AddAccount: undefined;
  SubscriptionManagement: undefined;
  SubscriptionEditor: { 
    mode: 'create' | 'edit';
    subscription?: TransactionWithType;
  };
};
