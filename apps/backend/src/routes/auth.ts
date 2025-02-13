import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { SignUpBody, SignInBody, AuthRequest } from '../types/auth';
import { createProfile, getProfileById } from '../db/queries/profiles';
import { authenticateUser } from '../middleware/auth';

const router = Router();

// Sign Up
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, full_name }: SignUpBody = req.body;

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      return res.status(400).json({ error: authError?.message || 'Signup failed' });
    }

    // Create profile
    const profile = await createProfile({
      id: authData.user.id,
      full_name,
      created_at: new Date(),
      updated_at: new Date(),
    });

    res.json({
      user: authData.user,
      session: authData.session,
      profile,
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sign In
router.post('/signin', async (req: Request, res: Response) => {
  try {
    const { email, password }: SignInBody = req.body;

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return res.status(400).json({ error: authError?.message || 'Sign in failed' });
    }

    // Get profile
    const profile = await getProfileById(authData.user.id);

    res.json({
      user: authData.user,
      session: authData.session,
      profile,
    });
  } catch (error) {
    console.error('Sign in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sign Out
router.post('/signout', authenticateUser, async (req: Request, res: Response) => {
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
});

// Get Current User
router.get('/me', authenticateUser, async (req: Request, res: Response) => {
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
});

export default router;
