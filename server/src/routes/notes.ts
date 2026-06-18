import { Router, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createNoteSchema, updateNoteSchema, idParamSchema } from '../schemas';
import { aiService } from '../services/ai/providers';
import { PROMPT_TEMPLATES, sanitizePrompt } from '../services/ai/prompts';
import logger from '../config/logger';

const router = Router();
router.use(authMiddleware);

// ─── Get All Notes ──────────────────────────────────────────────────
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, folder, sort = 'updated_at', order = 'desc' } = req.query;

    let query = supabaseAdmin
      .from('notes')
      .select('*')
      .eq('user_id', req.userId!)
      .order(sort as string, { ascending: order === 'asc' });

    if (folder) query = query.eq('folder', folder);
    if (search) query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ notes: data });
  } catch (err) {
    logger.error('Get notes error:', err);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// ─── Get Note by ID ─────────────────────────────────────────────────
router.get('/:id', validate(idParamSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('notes')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.json({ note: data });
  } catch (err) {
    logger.error('Get note error:', err);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
});

// ─── Create Note ────────────────────────────────────────────────────
router.post('/', validate(createNoteSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('notes')
      .insert({ ...req.body, user_id: req.userId })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ note: data });
  } catch (err) {
    logger.error('Create note error:', err);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// ─── Update Note ────────────────────────────────────────────────────
router.patch('/:id', validate(updateNoteSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('notes')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.json({ note: data });
  } catch (err) {
    logger.error('Update note error:', err);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// ─── Delete Note ────────────────────────────────────────────────────
router.delete('/:id', validate(idParamSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { error } = await supabaseAdmin
      .from('notes')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId!);

    if (error) throw error;
    res.json({ message: 'Note deleted' });
  } catch (err) {
    logger.error('Delete note error:', err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// ─── AI: Summarize Note ─────────────────────────────────────────────
router.post('/:id/ai-summarize', validate(idParamSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data: note } = await supabaseAdmin
      .from('notes')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();

    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    const response = await aiService.chat([
      { role: 'system', content: PROMPT_TEMPLATES.noteSummary.system },
      { role: 'user', content: sanitizePrompt(`Title: ${note.title}\n\nContent:\n${note.content}`) },
    ]);

    try {
      const analysis = JSON.parse(response.content);
      // Update note with AI-generated tags
      if (analysis.tags) {
        await supabaseAdmin
          .from('notes')
          .update({ tags: analysis.tags, ai_summary: analysis.summary })
          .eq('id', note.id);
      }
      res.json({ analysis });
    } catch {
      res.json({ analysis: { summary: response.content } });
    }
  } catch (err) {
    logger.error('Note AI summarize error:', err);
    res.status(500).json({ error: 'Failed to summarize note' });
  }
});

export default router;
