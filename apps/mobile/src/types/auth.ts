import { User } from '@supabase/supabase-js';

// Mirror backend types
export interface SignUpBody {
  email: string;
  password: string;
  full_name: string;
}

export interface SignInBody {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User | null;
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  } | null;
  profile: Profile | null;
  error?: string;
}

export interface Profile {
  id: string;
  full_name: string;
  created_at: Date;
  updated_at: Date;
}

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
