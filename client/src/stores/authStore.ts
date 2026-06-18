import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  role: 'user' | 'admin';
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;

  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      profile: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setSession: (session) => set({ session }),
      setProfile: (profile) => set({ profile }),
      setLoading: (isLoading) => set({ isLoading }),

      signUp: async (email, password, fullName) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        set({
          user: data.user,
          session: data.session,
          isAuthenticated: !!data.user,
        });
      },

      signIn: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        set({
          user: data.user,
          session: data.session,
          isAuthenticated: true,
        });
      },

      signInWithGoogle: async () => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({
          user: null,
          session: null,
          profile: null,
          isAuthenticated: false,
        });
      },

      forgotPassword: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        if (error) throw error;
      },

      initialize: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            set({
              user: session.user,
              session,
              profile: profile as Profile | null,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            set({ isLoading: false, isAuthenticated: false });
          }
        } catch {
          set({ isLoading: false, isAuthenticated: false });
        }

        // Listen for auth state changes
        supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            set({
              user: session.user,
              session,
              profile: profile as Profile | null,
              isAuthenticated: true,
            });
          } else {
            set({
              user: null,
              session: null,
              profile: null,
              isAuthenticated: false,
            });
          }
        });
      },
    }),
    {
      name: 'aura-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
