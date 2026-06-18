import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../stores/authStore';
import { Eye, EyeOff, Mail, Lock, User, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { signUp } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      await signUp(data.email, data.password, data.fullName);
      toast.success('Account created successfully!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create account';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Create account</h2>
        <p className="text-surface-200/50">Start your AI-powered productivity journey</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-surface-200/70 mb-2">Full Name</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-200/30" />
            <input {...register('fullName')} className="input-field pl-11" placeholder="John Doe" id="register-name" />
          </div>
          {errors.fullName && <p className="mt-1 text-sm text-red-400">{errors.fullName.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-200/70 mb-2">Email</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-200/30" />
            <input {...register('email')} type="email" className="input-field pl-11" placeholder="your@email.com" id="register-email" />
          </div>
          {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-200/70 mb-2">Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-200/30" />
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              className="input-field pl-11 pr-11"
              placeholder="Min 8 characters"
              id="register-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-200/30 hover:text-surface-200/60"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-200/70 mb-2">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-200/30" />
            <input
              {...register('confirmPassword')}
              type="password"
              className="input-field pl-11"
              placeholder="••••••••"
              id="register-confirm"
            />
          </div>
          {errors.confirmPassword && <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 mt-6"
          id="register-submit"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Create Account
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-surface-200/40">
        Already have an account?{' '}
        <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
