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

// Main tabs navigator
export type MainTabsParamList = {
  CalendarTab: undefined | { screen: keyof CalendarTabParamList; params: any };
  AccountsTab: undefined | { screen: keyof AccountsTabParamList; params: any };
};

// Main navigator that contains the tabs
export type MainStackParamList = MainTabsParamList & {
  // Any screens that are directly on the main stack, not in tabs
};
