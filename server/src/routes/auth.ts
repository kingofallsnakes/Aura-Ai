import { Router, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import logger from '../config/logger';
import { validate } from '../middleware/validate';
import { signUpSchema, signInSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas';

const router = Router();

// ─── Sign Up ────────────────────────────────────────────────────────
router.post('/signup', validate(signUpSchema), async (req, res: Response): Promise<void> => {
  try {
    const { email, password, fullName } = req.body;

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    // Create profile
    await supabaseAdmin.from('profiles').insert({
      id: data.user.id,
      email,
      full_name: fullName,
      role: 'user',
    });

    // Create default settings
    await supabaseAdmin.from('settings').insert({
      user_id: data.user.id,
      theme: 'dark',
      ai_mode: 'cloud',
      notifications_enabled: true,
    });

    // Sign in to get tokens
    const { data: session, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      res.status(200).json({
        user: data.user,
        message: 'Account created. Please sign in.',
      });
      return;
    }

    res.status(201).json({
      user: session.user,
      session: session.session,
    });
  } catch (err) {
    logger.error('Signup error:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// ─── Sign In ────────────────────────────────────────────────────────
router.post('/signin', validate(signInSchema), async (req, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Log activity
    await supabaseAdmin.from('activity_logs').insert({
      user_id: data.user.id,
      action: 'login',
      details: { method: 'email' },
    });

    res.json({
      user: data.user,
      session: data.session,
    });
  } catch (err) {
    logger.error('Signin error:', err);
    res.status(500).json({ error: 'Failed to sign in' });
  }
});

// ─── Google OAuth URL ───────────────────────────────────────────────
router.post('/google', async (_req, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.CORS_ORIGIN}/auth/callback`,
      },
    });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ url: data.url });
  } catch (err) {
    logger.error('Google auth error:', err);
    res.status(500).json({ error: 'Failed to initialize Google sign in' });
  }
});

// ─── Forgot Password ───────────────────────────────────────────────
router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.CORS_ORIGIN}/auth/reset-password`,
    });

    if (error) {
      logger.warn('Password reset error:', error);
    }

    // Always return success to prevent email enumeration
    res.json({ message: 'If an account exists, a password reset link has been sent.' });
  } catch (err) {
    logger.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// ─── Reset Password ────────────────────────────────────────────────
router.post('/reset-password', validate(resetPasswordSchema), async (req, res: Response): Promise<void> => {
  try {
    const { password } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'Missing authorization token' });
      return;
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password,
    });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    logger.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ─── Get Current User ──────────────────────────────────────────────
router.get('/me', async (req, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    res.json({ user, profile });
  } catch (err) {
    logger.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ─── Sign Out ──────────────────────────────────────────────────────
router.post('/signout', async (req, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      await supabaseAdmin.auth.admin.signOut(token);
    }
    res.json({ message: 'Signed out successfully' });
  } catch (err) {
    logger.error('Signout error:', err);
    res.status(500).json({ error: 'Failed to sign out' });
  }
});

export default router;
