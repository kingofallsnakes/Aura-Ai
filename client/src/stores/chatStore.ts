import { create } from 'zustand';
import { chatAPI } from '../lib/api';

interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

interface ChatSession {
  id: string;
  title: string;
  mode: string;
  updated_at: string;
}

interface ChatState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  activeMode: string;

  setSessions: (sessions: ChatSession[]) => void;
  setCurrentSession: (id: string | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setActiveMode: (mode: string) => void;

  fetchSessions: () => Promise<void>;
  fetchMessages: (sessionId: string) => Promise<void>;
  sendMessage: (message: string, context?: Record<string, unknown>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  newChat: () => void;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: [],
  isLoading: false,
  isSending: false,
  activeMode: 'chat',

  setSessions: (sessions) => set({ sessions }),
  setCurrentSession: (id) => set({ currentSessionId: id }),
  setMessages: (messages) => set({ messages }),
  setActiveMode: (mode) => set({ activeMode: mode }),

  fetchSessions: async () => {
    try {
      set({ isLoading: true });
      const { data } = await chatAPI.getSessions();
      set({ sessions: data.sessions, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchMessages: async (sessionId) => {
    try {
      set({ isLoading: true, currentSessionId: sessionId });
      const { data } = await chatAPI.getMessages(sessionId);
      set({ messages: data.messages, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  sendMessage: async (message, context) => {
    const { currentSessionId, activeMode, messages } = get();

    // Add user message optimistically
    const userMessage: ChatMessage = { role: 'user', content: message, created_at: new Date().toISOString() };
    set({ messages: [...messages, userMessage], isSending: true });

    try {
      const { data } = await chatAPI.sendMessage({
        message,
        sessionId: currentSessionId || undefined,
        mode: activeMode,
        context,
      });

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message,
        created_at: new Date().toISOString(),
      };

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        currentSessionId: data.sessionId,
        isSending: false,
      }));

      // Refresh sessions list
      get().fetchSessions();
    } catch {
      set((state) => ({
        messages: [
          ...state.messages,
          { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
        ],
        isSending: false,
      }));
    }
  },

  deleteSession: async (id) => {
    try {
      await chatAPI.deleteSession(id);
      const { currentSessionId } = get();
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== id),
        ...(currentSessionId === id ? { currentSessionId: null, messages: [] } : {}),
      }));
    } catch {
      // silent
    }
  },

  newChat: () => {
    set({ currentSessionId: null, messages: [] });
  },
}));
