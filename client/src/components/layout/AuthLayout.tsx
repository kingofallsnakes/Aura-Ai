import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-surface-900 flex">

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12">
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-3xl font-bold gradient-text">AURA AI</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Your Intelligent
            <br />
            <span className="gradient-text">Personal Assistant</span>
          </h1>
          <p className="text-surface-200/60 text-lg leading-relaxed">
            Organize your life with AI-powered task management, smart notes, goal tracking,
            and a knowledge base that understands your documents.
          </p>
          <div className="mt-10 flex gap-6">
            {[
              { label: 'AI Chat', icon: '💬' },
              { label: 'Smart Tasks', icon: '✅' },
              { label: 'Knowledge Base', icon: '📚' },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2 text-surface-200/50">
                <span className="text-xl">{f.icon}</span>
                <span className="text-sm">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Decorative gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md relative z-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
