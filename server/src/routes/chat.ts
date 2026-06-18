import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../config/supabase';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { chatMessageSchema } from '../schemas';
import { aiService, AIMessage } from '../services/ai/providers';
import { PROMPT_TEMPLATES, sanitizePrompt } from '../services/ai/prompts';
import { ragService, parseDocument } from '../services/ai/rag';
import logger from '../config/logger';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

// File upload config
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Allowed: PDF, DOCX, TXT'));
    }
  },
});

const router = Router();
router.use(authMiddleware);

// ─── Get Chat Sessions ──────────────────────────────────────────────
router.get('/sessions', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .eq('user_id', req.userId!)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    res.json({ sessions: data });
  } catch (err) {
    logger.error('Get sessions error:', err);
    res.status(500).json({ error: 'Failed to fetch chat sessions' });
  }
});

// ─── Get Session Messages ───────────────────────────────────────────
router.get('/sessions/:id/messages', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('session_id', req.params.id)
      .eq('user_id', req.userId!)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json({ messages: data });
  } catch (err) {
    logger.error('Get messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ─── Parse Resume File ──────────────────────────────────────────────
router.post('/resume/parse', upload.single('file'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const text = await parseDocument(req.file.path, req.file.mimetype);
    
    // Clean up temporary file
    fs.unlinkSync(req.file.path);

    res.json({ text });
  } catch (err) {
    logger.error('Resume parse error:', err);
    res.status(500).json({ error: 'Failed to parse resume file' });
  }
});

// ─── Send Message ───────────────────────────────────────────────────
router.post('/send', validate(chatMessageSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { message, sessionId, mode, context } = req.body;
    const sanitizedMessage = sanitizePrompt(message);

    // Get or create session
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const title = sanitizedMessage.substring(0, 100);
      const { data: session, error } = await supabaseAdmin
        .from('chat_sessions')
        .insert({
          id: uuidv4(),
          user_id: req.userId,
          title,
          mode,
        })
        .select()
        .single();

      if (error) throw error;
      currentSessionId = session.id;
    }

    // Save user message
    await supabaseAdmin.from('chat_messages').insert({
      session_id: currentSessionId,
      user_id: req.userId,
      role: 'user',
      content: sanitizedMessage,
    });

    // Get chat history
    const { data: history } = await supabaseAdmin
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', currentSessionId)
      .order('created_at', { ascending: true })
      .limit(20);

    const chatHistory: AIMessage[] = (history || []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Route to appropriate handler based on mode
    let aiResponse: string;

    switch (mode) {
      case 'rag':
        aiResponse = await ragService.answerWithContext(req.userId!, sanitizedMessage, chatHistory);
        break;

      case 'task':
        aiResponse = await handleTaskMode(sanitizedMessage, chatHistory);
        break;

      case 'goal':
        aiResponse = await handleGoalMode(sanitizedMessage, chatHistory);
        break;

      case 'learning':
        aiResponse = await handleLearningMode(sanitizedMessage, chatHistory);
        break;

      case 'resume':
        aiResponse = await handleResumeMode(sanitizedMessage, chatHistory, context);
        break;

      case 'email':
        aiResponse = await handleEmailMode(sanitizedMessage, chatHistory, context);
        break;

      case 'note':
        aiResponse = await handleNoteMode(sanitizedMessage, chatHistory);
        break;

      default:
        const response = await aiService.chat([
          { role: 'system', content: PROMPT_TEMPLATES.chat.system },
          ...chatHistory,
        ]);
        aiResponse = response.content;
    }

    // Save assistant message
    await supabaseAdmin.from('chat_messages').insert({
      session_id: currentSessionId,
      user_id: req.userId,
      role: 'assistant',
      content: aiResponse,
    });

    // Update session
    await supabaseAdmin
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', currentSessionId);

    // Log AI usage
    await supabaseAdmin.from('analytics').insert({
      user_id: req.userId,
      event_type: 'ai_chat',
      metadata: { mode, sessionId: currentSessionId },
    });

    res.json({
      sessionId: currentSessionId,
      message: aiResponse,
    });
  } catch (err) {
    logger.error('Chat send error:', err);
    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

// ─── Delete Session ─────────────────────────────────────────────────
router.delete('/sessions/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await supabaseAdmin
      .from('chat_messages')
      .delete()
      .eq('session_id', req.params.id)
      .eq('user_id', req.userId!);

    await supabaseAdmin
      .from('chat_sessions')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId!);

    res.json({ message: 'Session deleted' });
  } catch (err) {
    logger.error('Delete session error:', err);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// ─── Mode Handlers ──────────────────────────────────────────────────
function getMarkdownPrompt(systemPrompt: string): string {
  return systemPrompt.replace(
    /Respond in JSON format:[\s\S]*/,
    'Respond using clean, structured Markdown. Use clear headings (##), bullet points, and bold text to make it easy to read. DO NOT output JSON.'
  );
}

async function handleTaskMode(message: string, history: AIMessage[]): Promise<string> {
  const response = await aiService.chat([
    { role: 'system', content: getMarkdownPrompt(PROMPT_TEMPLATES.taskBreakdown.system) },
    ...history,
    { role: 'user', content: message },
  ]);
  return response.content;
}

async function handleGoalMode(message: string, history: AIMessage[]): Promise<string> {
  const response = await aiService.chat([
    { role: 'system', content: getMarkdownPrompt(PROMPT_TEMPLATES.goalProgress.system) },
    ...history,
    { role: 'user', content: message },
  ]);
  return response.content;
}

async function handleLearningMode(message: string, history: AIMessage[]): Promise<string> {
  const response = await aiService.chat([
    { role: 'system', content: getMarkdownPrompt(PROMPT_TEMPLATES.learningPlan.system) },
    ...history,
    { role: 'user', content: message },
  ]);
  return response.content;
}

async function handleResumeMode(message: string, history: AIMessage[], context?: Record<string, unknown>): Promise<string> {
  const prompt = context?.resumeContent
    ? `${message}\n\nResume Content:\n${context.resumeContent}`
    : message;

  const response = await aiService.chat([
    { role: 'system', content: getMarkdownPrompt(PROMPT_TEMPLATES.resumeAnalysis.system) },
    ...history,
    { role: 'user', content: prompt },
  ]);
  return response.content;
}

async function handleEmailMode(message: string, history: AIMessage[], context?: Record<string, unknown>): Promise<string> {
  const prompt = context?.emailContext
    ? `${message}\n\nContext: ${JSON.stringify(context.emailContext)}`
    : message;

  const response = await aiService.chat([
    { role: 'system', content: getMarkdownPrompt(PROMPT_TEMPLATES.emailCompose.system) },
    ...history,
    { role: 'user', content: prompt },
  ]);
  return response.content;
}

async function handleNoteMode(message: string, history: AIMessage[]): Promise<string> {
  const response = await aiService.chat([
    { role: 'system', content: getMarkdownPrompt(PROMPT_TEMPLATES.noteSummary.system) },
    ...history,
    { role: 'user', content: message },
  ]);
  return response.content;
}

export default router;
