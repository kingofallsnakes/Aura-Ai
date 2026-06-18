import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
  Zap, MessageSquare, CheckSquare, Target, BookOpen, GraduationCap,
  FileText, ArrowRight, Shield, Globe, Cpu, Star
} from 'lucide-react';

const features = [
  { icon: MessageSquare, title: 'AI Chat Assistant', desc: 'ChatGPT-style conversations for research, brainstorming, and productivity help.', color: 'from-blue-500 to-cyan-500' },
  { icon: CheckSquare, title: 'Smart Task Manager', desc: 'AI-powered task breakdown, priority estimation, and daily action plans.', color: 'from-emerald-500 to-green-500' },
  { icon: Target, title: 'Goal Tracker', desc: 'Track learning, career, and personal goals with AI progress reviews.', color: 'from-amber-500 to-orange-500' },
  { icon: BookOpen, title: 'Knowledge Base (RAG)', desc: 'Upload documents and ask questions about your own files using AI.', color: 'from-purple-500 to-violet-500' },
  { icon: GraduationCap, title: 'Learning Assistant', desc: 'AI-generated roadmaps, study plans, and practice questions.', color: 'from-pink-500 to-rose-500' },
  { icon: FileText, title: 'Resume & Email AI', desc: 'ATS-optimized resumes and professional email composition.', color: 'from-indigo-500 to-blue-500' },
];

const stats = [
  { value: '100%', label: 'Open Source' },
  { value: '6+', label: 'AI Models' },
  { value: '∞', label: 'Self-Hostable' },
  { value: '0', label: 'Data Sold' },
];

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col relative overflow-hidden">

      {/* ─── Navbar ──────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between max-w-7xl mx-auto px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">AURA AI</span>
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn-primary inline-flex items-center gap-2">
              Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">Sign In</Link>
              <Link to="/register" className="btn-primary">Get Started</Link>
            </>
          )}
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary-500/20 bg-primary-500/5 text-primary-400 text-sm font-medium mb-8">
          <Star className="w-3.5 h-3.5" /> Open Source & Privacy-First
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6 tracking-tight">
          Your AI-Powered
          <br />
          <span className="gradient-text">Personal Assistant</span>
        </h1>

        <p className="text-lg md:text-xl text-surface-200/50 max-w-2xl mx-auto mb-10 leading-relaxed">
          Organize tasks, notes, goals, and documents. Chat with AI, build knowledge bases,
          and supercharge your productivity — all in one beautiful platform.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link to="/register" className="btn-primary text-lg px-8 py-3 inline-flex items-center gap-2">
            Start Free <ArrowRight className="w-5 h-5" />
          </Link>
          <a href="#features" className="btn-secondary text-lg px-8 py-3 inline-flex items-center gap-2">
            <Globe className="w-5 h-5" /> Explore Features
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
          {stats.map((stat) => (
            <div key={stat.label} className="card text-center !p-4">
              <div className="text-2xl font-bold gradient-text">{stat.value}</div>
              <div className="text-sm text-surface-200/40 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────────── */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 pb-32">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Everything You Need</h2>
          <p className="text-surface-200/50 text-lg max-w-xl mx-auto">
            One platform to replace your scattered tools. AI-enhanced at every level.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="card group cursor-pointer">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <f.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-surface-200/50 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── AI Models ───────────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-32">
        <div className="card !p-10 md:!p-16 text-center gradient-border">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mx-auto mb-6">
            <Cpu className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Multiple AI Models</h2>
          <p className="text-surface-200/50 max-w-xl mx-auto mb-8">
            Use cloud models via OpenRouter or run locally with Ollama. Switch seamlessly between providers.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {['DeepSeek', 'Llama 3', 'Qwen', 'Gemma', 'Mistral'].map((m) => (
              <span key={m} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-surface-200/70 text-sm font-medium">
                {m}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Privacy ─────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-32">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Shield, title: 'Privacy First', desc: 'Self-host everything. Your data never leaves your servers.' },
            { icon: Globe, title: 'Open Source', desc: 'Full source code available. Audit, fork, and contribute.' },
            { icon: Cpu, title: 'Local AI', desc: 'Run AI models locally with Ollama. Zero cloud dependency.' },
          ].map((item) => (
            <div key={item.title} className="card text-center">
              <item.icon className="w-10 h-10 text-primary-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-surface-200/50 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to boost your productivity?</h2>
        <p className="text-surface-200/50 text-lg mb-8">Join AURA AI and take control of your workflow.</p>
        <Link to="/register" className="btn-primary text-lg px-10 py-3.5 inline-flex items-center gap-2">
          Get Started Free <ArrowRight className="w-5 h-5" />
        </Link>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary-400" />
            <span className="text-sm text-surface-200/40">AURA AI — Open Source AI Assistant</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-surface-200/40">
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
            <a href="#" className="hover:text-white transition-colors">Docs</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
