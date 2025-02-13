import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { SignUpBody, SignInBody, AuthRequest } from '../types/auth';
import { createProfile, getProfileById } from '../db/queries/profiles';

export async function signUp(req: Request, res: Response) {
  try {
    const { email, password, full_name }: SignUpBody = req.body;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name
        }
      }
    });

    if (error || !data.user) {
      return res.status(400).json({ error: error?.message || 'Signup failed' });
    }

    // Create profile
    const profile = await createProfile({
      id: data.user.id,
      full_name,
      created_at: new Date(),
      updated_at: new Date(),
    });

    res.json({
      user: data.user,
      session: data.session,
      profile
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function signIn(req: Request, res: Response) {
  try {
    const { email, password }: SignInBody = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.user) {
      return res.status(400).json({ error: error?.message || 'Sign in failed' });
    }

    // Get profile
    const profile = await getProfileById(data.user.id);

    res.json({
      user: data.user,
      session: data.session,
      profile
    });
  } catch (error) {
    console.error('Sign in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function signOut(req: Request, res: Response) {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Signed out successfully' });
  } catch (error) {
    console.error('Sign out error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    const { data: { user }, error: getUserError } = await supabase.auth.getUser();

    if (getUserError || !user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { error } = await supabase.auth.admin.deleteUser(user.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getMe(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const profile = await getProfileById(authReq.user.id);

    res.json({
      user: authReq.user,
      profile,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 