import { User } from '@supabase/supabase-js';
import { Request } from 'express';

export interface AuthRequest extends Request {
  user: User;
}