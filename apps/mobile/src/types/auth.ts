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

export type MainStackParamList = {
  AddAccount: undefined;
  Calendar: { transactions: any }; // TODO: Add proper type from your transactions
  DayDetail: { date: string; transactions: any[] }; // TODO: Add proper type from your transactions
};
