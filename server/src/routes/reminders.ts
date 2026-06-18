import { Router, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createReminderSchema, idParamSchema } from '../schemas';
import logger from '../config/logger';

const router = Router();
router.use(authMiddleware);

// ─── Get All Reminders ──────────────────────────────────────────────
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, upcoming } = req.query;

    let query = supabaseAdmin
      .from('reminders')
      .select('*')
      .eq('user_id', req.userId!)
      .order('remind_at', { ascending: true });

    if (status) query = query.eq('status', status);
    if (upcoming === 'true') {
      query = query.gte('remind_at', new Date().toISOString()).eq('status', 'pending');
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ reminders: data });
  } catch (err) {
    logger.error('Get reminders error:', err);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

// ─── Create Reminder ────────────────────────────────────────────────
router.post('/', validate(createReminderSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('reminders')
      .insert({ ...req.body, user_id: req.userId, status: 'pending' })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ reminder: data });
  } catch (err) {
    logger.error('Create reminder error:', err);
    res.status(500).json({ error: 'Failed to create reminder' });
  }
});

// ─── Update Reminder ────────────────────────────────────────────────
router.patch('/:id', validate(idParamSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('reminders')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }
    res.json({ reminder: data });
  } catch (err) {
    logger.error('Update reminder error:', err);
    res.status(500).json({ error: 'Failed to update reminder' });
  }
});

// ─── Delete Reminder ────────────────────────────────────────────────
router.delete('/:id', validate(idParamSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { error } = await supabaseAdmin
      .from('reminders')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId!);

    if (error) throw error;
    res.json({ message: 'Reminder deleted' });
  } catch (err) {
    logger.error('Delete reminder error:', err);
    res.status(500).json({ error: 'Failed to delete reminder' });
  }
});

// ─── Mark Reminder Done ─────────────────────────────────────────────
router.post('/:id/complete', validate(idParamSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('reminders')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }
    res.json({ reminder: data });
  } catch (err) {
    logger.error('Complete reminder error:', err);
    res.status(500).json({ error: 'Failed to complete reminder' });
  }
});

export default router;
