import axios from 'axios';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

// Request interceptor: attach auth token
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Response interceptor: handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        await supabase.auth.signOut();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── API Functions ──────────────────────────────────────────────────

// Auth
export const authAPI = {
  signUp: (data: { email: string; password: string; fullName: string }) =>
    api.post('/auth/signup', data),
  signIn: (data: { email: string; password: string }) =>
    api.post('/auth/signin', data),
  googleAuth: () => api.post('/auth/google'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (password: string) => api.post('/auth/reset-password', { password }),
  getMe: () => api.get('/auth/me'),
  signOut: () => api.post('/auth/signout'),
};

// Tasks
export const tasksAPI = {
  getAll: (params?: Record<string, string>) => api.get('/tasks', { params }),
  getById: (id: string) => api.get(`/tasks/${id}`),
  create: (data: Record<string, unknown>) => api.post('/tasks', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  aiBreakdown: (id: string) => api.post(`/tasks/${id}/ai-breakdown`),
  aiDailyPlan: () => api.post('/tasks/ai-daily-plan'),
};

// Notes
export const notesAPI = {
  getAll: (params?: Record<string, string>) => api.get('/notes', { params }),
  getById: (id: string) => api.get(`/notes/${id}`),
  create: (data: Record<string, unknown>) => api.post('/notes', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/notes/${id}`, data),
  delete: (id: string) => api.delete(`/notes/${id}`),
  aiSummarize: (id: string) => api.post(`/notes/${id}/ai-summarize`),
};

// Goals
export const goalsAPI = {
  getAll: (params?: Record<string, string>) => api.get('/goals', { params }),
  create: (data: Record<string, unknown>) => api.post('/goals', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/goals/${id}`, data),
  delete: (id: string) => api.delete(`/goals/${id}`),
  aiReview: (id: string) => api.post(`/goals/${id}/ai-review`),
};

// Reminders
export const remindersAPI = {
  getAll: (params?: Record<string, string>) => api.get('/reminders', { params }),
  create: (data: Record<string, unknown>) => api.post('/reminders', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/reminders/${id}`, data),
  delete: (id: string) => api.delete(`/reminders/${id}`),
  complete: (id: string) => api.post(`/reminders/${id}/complete`),
};

// Chat
export const chatAPI = {
  getSessions: () => api.get('/chat/sessions'),
  getMessages: (sessionId: string) => api.get(`/chat/sessions/${sessionId}/messages`),
  sendMessage: (data: { message: string; sessionId?: string; mode?: string; context?: Record<string, unknown> }) =>
    api.post('/chat/send', data),
  parseResume: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/chat/resume/parse', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteSession: (id: string) => api.delete(`/chat/sessions/${id}`),
};

// Knowledge Base
export const knowledgeBaseAPI = {
  getDocuments: () => api.get('/knowledge-base/documents'),
  uploadDocument: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/knowledge-base/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteDocument: (id: string) => api.delete(`/knowledge-base/documents/${id}`),
  query: (query: string) => api.post('/knowledge-base/query', { query }),
  analyzeDocument: (id: string) => api.post(`/knowledge-base/documents/${id}/analyze`),
};

// Settings & Dashboard
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data: Record<string, unknown>) => api.patch('/settings', data),
  updateProfile: (data: Record<string, unknown>) => api.patch('/profile', data),
  getAIStatus: () => api.get('/ai-status'),
  getDashboard: () => api.get('/dashboard'),
};

// Admin
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: () => api.get('/admin/users'),
  getActivityLogs: (limit?: number) => api.get('/admin/activity-logs', { params: { limit } }),
};
