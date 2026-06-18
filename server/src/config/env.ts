import dotenv from 'dotenv';
import { z } from 'zod';

import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  SUPABASE_URL: z.string().min(1, 'SUPABASE_URL is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),

  OPENROUTER_API_KEY: z.string().optional().default(''),
  OPENROUTER_DEFAULT_MODEL: z.string().default('deepseek/deepseek-chat'),

  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  OLLAMA_DEFAULT_MODEL: z.string().default('llama3'),

  AI_MODE: z.enum(['cloud', 'local', 'hybrid']).default('cloud'),

  WEATHER_API_KEY: z.string().optional().default(''),
  NEWS_API_KEY: z.string().optional().default(''),
  EMAIL_API_KEY: z.string().optional().default(''),

  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
  AI_RATE_LIMIT_MAX: z.string().default('30'),

  MAX_FILE_SIZE_MB: z.string().default('10'),
  ALLOWED_FILE_TYPES: z.string().default('pdf,docx,txt,md'),

  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

function validateEnv() {
  try {
    const env = envSchema.parse(process.env);
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.issues.map((i) => `  ✗ ${i.path.join('.')}: ${i.message}`);
      console.error('\n❌ Environment validation failed:\n');
      console.error(missing.join('\n'));
      console.error('\nPlease check your .env file.\n');
      process.exit(1);
    }
    throw error;
  }
}

export const env = validateEnv();
export type Env = z.infer<typeof envSchema>;
