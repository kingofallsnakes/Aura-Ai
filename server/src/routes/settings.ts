import { Router, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthenticatedRequest, authMiddleware, adminMiddleware } from '../middleware/auth';
import { aiService } from '../services/ai/providers';
import { validate } from '../middleware/validate';
import { updateSettingsSchema } from '../schemas';
import logger from '../config/logger';

const router = Router();

// ─── User Settings ──────────────────────────────────────────────────
router.get('/settings', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('*')
      .eq('user_id', req.userId!)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.json({ settings: data || { theme: 'dark', ai_mode: 'cloud' } });
  } catch (err) {
    logger.error('Get settings error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.patch('/settings', authMiddleware, validate(updateSettingsSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data: existing } = await supabaseAdmin
      .from('settings')
      .select('*')
      .eq('user_id', req.userId!)
      .single();

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from('settings')
        .update(req.body)
        .eq('user_id', req.userId!)
        .select()
        .single();

      if (error) throw error;

      // Update AI mode if changed
      if (req.body.ai_mode) {
        aiService.setMode(req.body.ai_mode);
      }

      res.json({ settings: data });
    } else {
      const { data, error } = await supabaseAdmin
        .from('settings')
        .insert({ ...req.body, user_id: req.userId })
        .select()
        .single();

      if (error) throw error;
      res.json({ settings: data });
    }
  } catch (err) {
    logger.error('Update settings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ─── User Profile ───────────────────────────────────────────────────
router.patch('/profile', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { full_name, avatar_url, bio } = req.body;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ full_name, avatar_url, bio, updated_at: new Date().toISOString() })
      .eq('id', req.userId!)
      .select()
      .single();

    if (error) throw error;
    res.json({ profile: data });
  } catch (err) {
    logger.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ─── AI Status ──────────────────────────────────────────────────────
router.get('/ai-status', authMiddleware, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const status = await aiService.getStatus();
    res.json(status);
  } catch (err) {
    logger.error('AI status error:', err);
    res.status(500).json({ error: 'Failed to get AI status' });
  }
});

// ─── Dashboard Stats ────────────────────────────────────────────────
router.get('/dashboard', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const [tasks, goals, notes, reminders, sessions] = await Promise.all([
      supabaseAdmin.from('tasks').select('id, status, priority', { count: 'exact' }).eq('user_id', userId),
      supabaseAdmin.from('goals').select('id, status, progress', { count: 'exact' }).eq('user_id', userId),
      supabaseAdmin.from('notes').select('id', { count: 'exact' }).eq('user_id', userId),
      supabaseAdmin.from('reminders').select('id, status, remind_at').eq('user_id', userId).eq('status', 'pending'),
      supabaseAdmin.from('chat_sessions').select('id', { count: 'exact' }).eq('user_id', userId),
    ]);

    const tasksByStatus = {
      todo: (tasks.data || []).filter((t) => t.status === 'todo').length,
      in_progress: (tasks.data || []).filter((t) => t.status === 'in_progress').length,
      done: (tasks.data || []).filter((t) => t.status === 'done').length,
    };

    const activeGoals = (goals.data || []).filter((g) => g.status === 'active');
    const avgProgress = activeGoals.length > 0
      ? Math.round(activeGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / activeGoals.length)
      : 0;

    res.json({
      stats: {
        totalTasks: tasks.count || 0,
        tasksByStatus,
        totalGoals: goals.count || 0,
        activeGoals: activeGoals.length,
        avgGoalProgress: avgProgress,
        totalNotes: notes.count || 0,
        pendingReminders: (reminders.data || []).length,
        upcomingReminders: (reminders.data || []).filter(
          (r) => new Date(r.remind_at) <= new Date(Date.now() + 24 * 60 * 60 * 1000)
        ),
        totalChatSessions: sessions.count || 0,
      },
    });
  } catch (err) {
    logger.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// ═══════════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════════

router.get('/admin/stats', authMiddleware, adminMiddleware, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [users, tasks, sessions, documents, analytics] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, created_at', { count: 'exact' }),
      supabaseAdmin.from('tasks').select('id', { count: 'exact' }),
      supabaseAdmin.from('chat_sessions').select('id', { count: 'exact' }),
      supabaseAdmin.from('uploaded_documents').select('id, file_size', { count: 'exact' }),
      supabaseAdmin
        .from('analytics')
        .select('event_type')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    const totalStorage = (documents.data || []).reduce((sum, d) => sum + (d.file_size || 0), 0);
    const aiUsage = (analytics.data || []).filter((a) => a.event_type === 'ai_chat').length;

    res.json({
      stats: {
        totalUsers: users.count || 0,
        totalTasks: tasks.count || 0,
        totalChatSessions: sessions.count || 0,
        totalDocuments: documents.count || 0,
        totalStorageBytes: totalStorage,
        aiRequestsLast7Days: aiUsage,
        recentSignups: (users.data || [])
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10),
      },
    });
  } catch (err) {
    logger.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

router.get('/admin/users', authMiddleware, adminMiddleware, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ users: data });
  } catch (err) {
    logger.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/admin/activity-logs', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const { data, error } = await supabaseAdmin
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json({ logs: data });
  } catch (err) {
    logger.error('Admin logs error:', err);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

export default router;
