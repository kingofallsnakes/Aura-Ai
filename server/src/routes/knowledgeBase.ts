import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../config/supabase';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { kbQuerySchema } from '../schemas';
import { ragService } from '../services/ai/rag';
import { aiService } from '../services/ai/providers';
import { PROMPT_TEMPLATES, sanitizePrompt } from '../services/ai/prompts';
import { env } from '../config/env';
import logger from '../config/logger';

const router = Router();
router.use(authMiddleware);

// File upload config
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});

const allowedMimeTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
];

const upload = multer({
  storage,
  limits: { fileSize: parseInt(env.MAX_FILE_SIZE_MB) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Allowed: PDF, DOCX, TXT, MD'));
    }
  },
});

// ─── Get All Documents ──────────────────────────────────────────────
router.get('/documents', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('uploaded_documents')
      .select('id, file_name, file_type, file_size, status, created_at')
      .eq('user_id', req.userId!)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ documents: data });
  } catch (err) {
    logger.error('Get documents error:', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// ─── Upload Document ────────────────────────────────────────────────
router.post('/upload', upload.single('file'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const docId = uuidv4();

    // Save document record
    const { error: dbError } = await supabaseAdmin
      .from('uploaded_documents')
      .insert({
        id: docId,
        user_id: req.userId,
        file_name: req.file.originalname,
        file_type: req.file.mimetype,
        file_size: req.file.size,
        file_path: req.file.path,
        status: 'processing',
      });

    if (dbError) throw dbError;

    // Process document asynchronously
    ragService
      .ingestDocument(req.userId!, docId, req.file.path, req.file.originalname, req.file.mimetype)
      .then(() => {
        logger.info(`Document ${req.file!.originalname} processed successfully`);
      })
      .catch((err) => {
        logger.error(`Document processing failed for ${req.file!.originalname}:`, err);
      });

    res.status(201).json({
      document: {
        id: docId,
        fileName: req.file.originalname,
        status: 'processing',
      },
      message: 'Document uploaded. Processing in background.',
    });
  } catch (err) {
    logger.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// ─── Delete Document ────────────────────────────────────────────────
router.delete('/documents/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Delete chunks first
    await supabaseAdmin
      .from('document_chunks')
      .delete()
      .eq('document_id', req.params.id)
      .eq('user_id', req.userId!);

    // Get file path
    const { data: doc } = await supabaseAdmin
      .from('uploaded_documents')
      .select('file_path')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();

    // Delete file
    if (doc?.file_path && fs.existsSync(doc.file_path)) {
      fs.unlinkSync(doc.file_path);
    }

    // Delete record
    await supabaseAdmin
      .from('uploaded_documents')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId!);

    res.json({ message: 'Document deleted' });
  } catch (err) {
    logger.error('Delete document error:', err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// ─── Query Knowledge Base ───────────────────────────────────────────
router.post('/query', validate(kbQuerySchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { query } = req.body;
    const answer = await ragService.answerWithContext(req.userId!, sanitizePrompt(query));
    res.json({ answer });
  } catch (err) {
    logger.error('KB query error:', err);
    res.status(500).json({ error: 'Failed to query knowledge base' });
  }
});

// ─── Analyze Document ───────────────────────────────────────────────
router.post('/documents/:id/analyze', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data: doc } = await supabaseAdmin
      .from('uploaded_documents')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();

    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    const { data: chunks } = await supabaseAdmin
      .from('document_chunks')
      .select('content')
      .eq('document_id', doc.id)
      .order('chunk_index', { ascending: true })
      .limit(10);

    const content = (chunks || []).map((c) => c.content).join('\n\n');

    const response = await aiService.chat([
      { role: 'system', content: PROMPT_TEMPLATES.documentAnalysis.system },
      { role: 'user', content: sanitizePrompt(content.substring(0, 8000)) },
    ]);

    try {
      const analysis = JSON.parse(response.content);
      res.json({ analysis });
    } catch {
      res.json({ analysis: { summary: response.content } });
    }
  } catch (err) {
    logger.error('Document analysis error:', err);
    res.status(500).json({ error: 'Failed to analyze document' });
  }
});

export default router;
