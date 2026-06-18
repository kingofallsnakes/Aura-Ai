import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import { env } from './config/env';
import logger from './config/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Routes
import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import noteRoutes from './routes/notes';
import goalRoutes from './routes/goals';
import reminderRoutes from './routes/reminders';
import chatRoutes from './routes/chat';
import knowledgeBaseRoutes from './routes/knowledgeBase';
import settingsRoutes from './routes/settings';

const app = express();

// ─── Security Middleware ────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(hpp());
app.use(cors({
  origin: env.CORS_ORIGIN.split(',').map(o => o.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Rate Limiting ──────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS),
  max: parseInt(env.RATE_LIMIT_MAX_REQUESTS),
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS),
  max: parseInt(env.AI_RATE_LIMIT_MAX),
  message: { error: 'AI rate limit reached. Please wait before sending more AI requests.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', generalLimiter);
app.use('/api/chat/', aiLimiter);
app.use('/api/knowledge-base/query', aiLimiter);

// ─── Body Parsing ───────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// ─── Health Check ───────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: env.NODE_ENV,
  });
});

// ─── API Routes ─────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/knowledge-base', knowledgeBaseRoutes);
app.use('/api', settingsRoutes);

// ─── Error Handling ─────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────────────────
const PORT = parseInt(env.PORT);

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 AURA AI Server running on port ${PORT}`);
  logger.info(`📍 Environment: ${env.NODE_ENV}`);
  logger.info(`🔗 CORS Origin: ${env.CORS_ORIGIN}`);
  logger.info(`🤖 AI Mode: ${env.AI_MODE}`);
});

export default app;
