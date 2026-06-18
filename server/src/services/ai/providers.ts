import axios, { AxiosError } from 'axios';
import { env } from '../../config/env';
import logger from '../../config/logger';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIProvider {
  chat(messages: AIMessage[], options?: ChatOptions): Promise<AIResponse>;
  isAvailable(): Promise<boolean>;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

// ─── OpenRouter Provider ────────────────────────────────────────────
export class OpenRouterProvider implements AIProvider {
  private baseUrl = 'https://openrouter.ai/api/v1';
  private apiKey: string;
  private defaultModel: string;

  constructor() {
    this.apiKey = env.OPENROUTER_API_KEY;
    this.defaultModel = env.OPENROUTER_DEFAULT_MODEL;
  }

  async chat(messages: AIMessage[], options: ChatOptions = {}): Promise<AIResponse> {
    const model = options.model || this.defaultModel;
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.post(
          `${this.baseUrl}/chat/completions`,
          {
            model,
            messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 2048,
          },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://aura-ai.app',
              'X-Title': 'AURA AI',
            },
            timeout: 60000,
          }
        );

        const choice = response.data.choices?.[0];
        if (!choice?.message?.content) {
          throw new Error('Empty response from OpenRouter');
        }

        return {
          content: choice.message.content,
          model: response.data.model || model,
          usage: response.data.usage
            ? {
                promptTokens: response.data.usage.prompt_tokens,
                completionTokens: response.data.usage.completion_tokens,
                totalTokens: response.data.usage.total_tokens,
              }
            : undefined,
        };
      } catch (error) {
        lastError = error as Error;
        const axiosError = error as AxiosError;

        if (axiosError.response?.status === 429) {
          const waitTime = Math.pow(2, attempt) * 1000;
          logger.warn(`Rate limited by OpenRouter, retrying in ${waitTime}ms (attempt ${attempt}/${maxRetries})`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }

        if (axiosError.response?.status && axiosError.response.status >= 500) {
          const waitTime = Math.pow(2, attempt) * 1000;
          logger.warn(`OpenRouter server error, retrying in ${waitTime}ms (attempt ${attempt}/${maxRetries})`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }

        throw error;
      }
    }

    throw lastError || new Error('Failed to get response from OpenRouter');
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }
}

// ─── Ollama Provider ────────────────────────────────────────────────
export class OllamaProvider implements AIProvider {
  private baseUrl: string;
  private defaultModel: string;

  constructor() {
    this.baseUrl = env.OLLAMA_BASE_URL;
    this.defaultModel = env.OLLAMA_DEFAULT_MODEL;
  }

  async chat(messages: AIMessage[], options: ChatOptions = {}): Promise<AIResponse> {
    const model = options.model || this.defaultModel;

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/chat`,
        {
          model,
          messages,
          stream: false,
          options: {
            temperature: options.temperature ?? 0.7,
            num_predict: options.maxTokens ?? 2048,
          },
        },
        { timeout: 120000 }
      );

      return {
        content: response.data.message?.content || '',
        model,
        usage: response.data.eval_count
          ? {
              promptTokens: response.data.prompt_eval_count || 0,
              completionTokens: response.data.eval_count || 0,
              totalTokens: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0),
            }
          : undefined,
      };
    } catch (error) {
      logger.error('Ollama request failed:', error);
      throw new Error('Failed to get response from Ollama. Is the server running?');
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/api/tags`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

// ─── AI Service (Provider Switcher) ─────────────────────────────────
export class AIService {
  private cloudProvider: OpenRouterProvider;
  private localProvider: OllamaProvider;
  private mode: string;

  constructor() {
    this.cloudProvider = new OpenRouterProvider();
    this.localProvider = new OllamaProvider();
    this.mode = env.AI_MODE;
  }

  async chat(messages: AIMessage[], options: ChatOptions = {}): Promise<AIResponse> {
    const provider = await this.getProvider();
    return provider.chat(messages, options);
  }

  async getProvider(): Promise<AIProvider> {
    switch (this.mode) {
      case 'local':
        if (await this.localProvider.isAvailable()) {
          return this.localProvider;
        }
        throw new Error('Local AI (Ollama) is not available. Please start Ollama.');

      case 'hybrid':
        if (await this.cloudProvider.isAvailable()) {
          return this.cloudProvider;
        }
        if (await this.localProvider.isAvailable()) {
          logger.info('Cloud AI unavailable, falling back to local');
          return this.localProvider;
        }
        throw new Error('No AI provider available');

      case 'cloud':
      default:
        if (await this.cloudProvider.isAvailable()) {
          return this.cloudProvider;
        }
        throw new Error('Cloud AI (OpenRouter) API key not configured');
    }
  }

  setMode(mode: 'cloud' | 'local' | 'hybrid'): void {
    this.mode = mode;
  }

  async getStatus(): Promise<{
    mode: string;
    cloudAvailable: boolean;
    localAvailable: boolean;
  }> {
    return {
      mode: this.mode,
      cloudAvailable: await this.cloudProvider.isAvailable(),
      localAvailable: await this.localProvider.isAvailable(),
    };
  }
}

export const aiService = new AIService();
