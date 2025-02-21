import { User } from "@supabase/supabase-js";
import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: User;
}

export interface SignUpBody {
    email: string
    password: string
    full_name: string
  }
  
export interface SignInBody {
    email: string
    password: string
}

export interface AuthResponse {
    user: User | null
    session: {
        access_token: string
        refresh_token: string
        expires_in: number
    } | null
    error?: string
}