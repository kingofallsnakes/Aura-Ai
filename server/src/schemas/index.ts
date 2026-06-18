import { z } from 'zod';

// ─── Auth Schemas ───────────────────────────────────────────────────
export const signUpSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  }),
});

export const signInSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
});

// ─── Task Schemas ───────────────────────────────────────────────────
export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(255),
    description: z.string().max(5000).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).default('todo'),
    due_date: z.string().datetime().optional().nullable(),
    estimated_minutes: z.number().min(0).optional(),
    tags: z.array(z.string()).optional(),
    parent_task_id: z.string().uuid().optional().nullable(),
  }),
});

export const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().max(5000).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).optional(),
    due_date: z.string().datetime().optional().nullable(),
    estimated_minutes: z.number().min(0).optional(),
    tags: z.array(z.string()).optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});

// ─── Note Schemas ───────────────────────────────────────────────────
export const createNoteSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(255),
    content: z.string().max(50000),
    tags: z.array(z.string()).optional(),
    is_pinned: z.boolean().default(false),
    folder: z.string().max(100).optional(),
  }),
});

export const updateNoteSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(255).optional(),
    content: z.string().max(50000).optional(),
    tags: z.array(z.string()).optional(),
    is_pinned: z.boolean().optional(),
    folder: z.string().max(100).optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});

// ─── Goal Schemas ───────────────────────────────────────────────────
export const createGoalSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(255),
    description: z.string().max(5000).optional(),
    category: z.enum(['learning', 'career', 'project', 'personal', 'health', 'finance']),
    target_date: z.string().datetime().optional().nullable(),
    milestones: z.array(z.object({
      title: z.string(),
      completed: z.boolean().default(false),
    })).optional(),
  }),
});

export const updateGoalSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().max(5000).optional(),
    category: z.enum(['learning', 'career', 'project', 'personal', 'health', 'finance']).optional(),
    status: z.enum(['active', 'completed', 'paused', 'cancelled']).optional(),
    progress: z.number().min(0).max(100).optional(),
    target_date: z.string().datetime().optional().nullable(),
    milestones: z.array(z.object({
      title: z.string(),
      completed: z.boolean(),
    })).optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});

// ─── Reminder Schemas ───────────────────────────────────────────────
export const createReminderSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(255),
    description: z.string().max(2000).optional(),
    remind_at: z.string().datetime(),
    repeat: z.enum(['none', 'daily', 'weekly', 'monthly']).default('none'),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
  }),
});

// ─── Chat Schemas ───────────────────────────────────────────────────
export const chatMessageSchema = z.object({
  body: z.object({
    message: z.string().min(1).max(10000),
    sessionId: z.string().uuid().optional(),
    mode: z.enum(['chat', 'rag', 'task', 'goal', 'note', 'learning', 'resume', 'email']).default('chat'),
    context: z.record(z.any()).optional(),
  }),
});

// ─── Knowledge Base Schemas ─────────────────────────────────────────
export const kbQuerySchema = z.object({
  body: z.object({
    query: z.string().min(1).max(5000),
  }),
});

// ─── Settings Schemas ───────────────────────────────────────────────
export const updateSettingsSchema = z.object({
  body: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    ai_mode: z.enum(['cloud', 'local', 'hybrid']).optional(),
    ai_model: z.string().optional(),
    language: z.string().max(10).optional(),
    notifications_enabled: z.boolean().optional(),
  }),
});

// ─── ID Param Schema ────────────────────────────────────────────────
export const idParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),
});
