import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import logger from '../config/logger';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  accessToken?: string;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    req.userId = user.id;
    req.userEmail = user.email;
    req.accessToken = token;

    // Fetch user role from profiles
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    req.userRole = profile?.role || 'user';
    next();
  } catch (err) {
    logger.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

export const adminMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.userRole !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        req.userId = user.id;
        req.userEmail = user.email;
        req.accessToken = token;
      }
    }
    next();
  } catch {
    next();
  }
};
