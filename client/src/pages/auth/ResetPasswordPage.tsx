import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Lock, Loader2, Check, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsReady(true);
      }
      setChecking(false);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setIsReady(true);
        setChecking(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated successfully!');
      navigate('/login', { replace: true });
    } catch {
      toast.error('Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400 mx-auto" />
        <p className="text-surface-200/50 mt-4 text-sm">Verifying reset link...</p>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Invalid or expired link</h2>
        <p className="text-surface-200/50 mb-6">Please request a new password reset link.</p>
        <Link to="/forgot-password" className="btn-primary inline-flex items-center gap-2">
          Request new link
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Set new password</h2>
        <p className="text-surface-200/50">Enter your new password below</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-surface-200/70 mb-2">New Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-200/30" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field pl-11"
              placeholder="At least 8 characters"
              required
              minLength={8}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-200/70 mb-2">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-200/30" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field pl-11"
              placeholder="Confirm your password"
              required
              minLength={8}
            />
          </div>
        </div>

        <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Update Password
        </button>
      </form>

      <p className="mt-6 text-center">
        <Link to="/login" className="text-sm text-primary-400 hover:text-primary-300 inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Back to login
        </Link>
      </p>
    </div>
  );
}
