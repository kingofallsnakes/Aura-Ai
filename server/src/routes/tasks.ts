import { Router, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createTaskSchema, updateTaskSchema, idParamSchema } from '../schemas';
import { aiService } from '../services/ai/providers';
import { PROMPT_TEMPLATES, sanitizePrompt } from '../services/ai/prompts';
import logger from '../config/logger';

const router = Router();
router.use(authMiddleware);

// ─── Get All Tasks ──────────────────────────────────────────────────
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, priority, search, sort = 'created_at', order = 'desc' } = req.query;

    let query = supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('user_id', req.userId!)
      .order(sort as string, { ascending: order === 'asc' });

    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);
    if (search) query = query.ilike('title', `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ tasks: data });
  } catch (err) {
    logger.error('Get tasks error:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// ─── Get Task by ID ─────────────────────────────────────────────────
router.get('/:id', validate(idParamSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json({ task: data });
  } catch (err) {
    logger.error('Get task error:', err);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// ─── Create Task ────────────────────────────────────────────────────
router.post('/', validate(createTaskSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('tasks')
      .insert({ ...req.body, user_id: req.userId })
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await supabaseAdmin.from('activity_logs').insert({
      user_id: req.userId,
      action: 'task_created',
      resource_type: 'task',
      resource_id: data.id,
      details: { title: data.title },
    });

    res.status(201).json({ task: data });
  } catch (err) {
    logger.error('Create task error:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// ─── Update Task ────────────────────────────────────────────────────
router.patch('/:id', validate(updateTaskSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('tasks')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    res.json({ task: data });
  } catch (err) {
    logger.error('Update task error:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// ─── Delete Task ────────────────────────────────────────────────────
router.delete('/:id', validate(idParamSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { error } = await supabaseAdmin
      .from('tasks')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId!);

    if (error) throw error;

    res.json({ message: 'Task deleted' });
  } catch (err) {
    logger.error('Delete task error:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// ─── AI: Break Down Task ────────────────────────────────────────────
router.post('/:id/ai-breakdown', validate(idParamSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data: task } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const response = await aiService.chat([
      { role: 'system', content: PROMPT_TEMPLATES.taskBreakdown.system },
      { role: 'user', content: sanitizePrompt(`Task: ${task.title}\nDescription: ${task.description || 'No description'}\nPriority: ${task.priority}\nDue: ${task.due_date || 'No deadline'}`) },
    ]);

    try {
      const breakdown = JSON.parse(response.content);
      res.json({ breakdown });
    } catch {
      res.json({ breakdown: { suggestions: response.content } });
    }
  } catch (err) {
    logger.error('Task AI breakdown error:', err);
    res.status(500).json({ error: 'Failed to generate task breakdown' });
  }
});

// ─── AI: Daily Action Plan ──────────────────────────────────────────
router.post('/ai-daily-plan', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data: tasks } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('user_id', req.userId!)
      .in('status', ['todo', 'in_progress'])
      .order('priority', { ascending: false });

    const taskList = (tasks || [])
      .map((t) => `- ${t.title} [${t.priority}] ${t.due_date ? `Due: ${t.due_date}` : ''}`)
      .join('\n');

    const response = await aiService.chat([
      {
        role: 'system',
        content: 'You are a productivity coach. Create a focused daily action plan. Prioritize tasks by urgency and importance. Suggest time blocks. Be actionable and concise. Use markdown.',
      },
      {
        role: 'user',
        content: sanitizePrompt(`Here are my current tasks:\n${taskList}\n\nCreate a daily action plan for today.`),
      },
    ]);

    res.json({ plan: response.content });
  } catch (err) {
    logger.error('Daily plan error:', err);
    res.status(500).json({ error: 'Failed to generate daily plan' });
  }
});

export default router;
