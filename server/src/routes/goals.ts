import { Router, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createGoalSchema, updateGoalSchema, idParamSchema } from '../schemas';
import { aiService } from '../services/ai/providers';
import { PROMPT_TEMPLATES, sanitizePrompt } from '../services/ai/prompts';
import logger from '../config/logger';

const router = Router();
router.use(authMiddleware);

// ─── Get All Goals ──────────────────────────────────────────────────
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { category, status } = req.query;
    let query = supabaseAdmin
      .from('goals')
      .select('*')
      .eq('user_id', req.userId!)
      .order('created_at', { ascending: false });

    if (category) query = query.eq('category', category);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ goals: data });
  } catch (err) {
    logger.error('Get goals error:', err);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// ─── Create Goal ────────────────────────────────────────────────────
router.post('/', validate(createGoalSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('goals')
      .insert({ ...req.body, user_id: req.userId, status: 'active', progress: 0 })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ goal: data });
  } catch (err) {
    logger.error('Create goal error:', err);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// ─── Update Goal ────────────────────────────────────────────────────
router.patch('/:id', validate(updateGoalSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('goals')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    // Log progress
    if (req.body.progress !== undefined) {
      await supabaseAdmin.from('goal_progress').insert({
        goal_id: data.id,
        user_id: req.userId,
        progress_value: req.body.progress,
        note: req.body.progressNote || '',
      });
    }

    res.json({ goal: data });
  } catch (err) {
    logger.error('Update goal error:', err);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// ─── Delete Goal ────────────────────────────────────────────────────
router.delete('/:id', validate(idParamSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { error } = await supabaseAdmin
      .from('goals')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId!);

    if (error) throw error;
    res.json({ message: 'Goal deleted' });
  } catch (err) {
    logger.error('Delete goal error:', err);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

// ─── AI: Goal Progress Report ───────────────────────────────────────
router.post('/:id/ai-review', validate(idParamSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data: goal } = await supabaseAdmin
      .from('goals')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();

    if (!goal) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    const { data: progressHistory } = await supabaseAdmin
      .from('goal_progress')
      .select('*')
      .eq('goal_id', goal.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const response = await aiService.chat([
      { role: 'system', content: PROMPT_TEMPLATES.goalProgress.system },
      {
        role: 'user',
        content: sanitizePrompt(`Goal: ${goal.title}
Description: ${goal.description || ''}
Category: ${goal.category}
Current Progress: ${goal.progress}%
Target Date: ${goal.target_date || 'Not set'}
Milestones: ${JSON.stringify(goal.milestones || [])}
Progress History: ${JSON.stringify(progressHistory || [])}`),
      },
    ]);

    try {
      const review = JSON.parse(response.content);
      res.json({ review });
    } catch {
      res.json({ review: { weeklyReview: response.content } });
    }
  } catch (err) {
    logger.error('Goal AI review error:', err);
    res.status(500).json({ error: 'Failed to generate goal review' });
  }
});

export default router;
