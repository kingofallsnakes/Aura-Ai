import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuthStore();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
      toast.success('Reset link sent!');
    } catch {
      toast.error('Failed to send reset link');
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Check your email</h2>
        <p className="text-surface-200/50 mb-6">We've sent a password reset link to <strong className="text-white">{email}</strong></p>
        <Link to="/login" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Reset password</h2>
        <p className="text-surface-200/50">Enter your email to receive a reset link</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-surface-200/70 mb-2">Email</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-200/30" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field pl-11"
              placeholder="your@email.com"
              required
              id="forgot-email"
            />
          </div>
        </div>

        <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2" id="forgot-submit">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Send Reset Link
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
