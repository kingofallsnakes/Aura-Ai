import { useState } from 'react';
import { chatAPI } from '../lib/api';
import { GraduationCap, Send, Loader2, BookOpen, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const suggestions = [
  'Create a learning roadmap for Machine Learning',
  'How do I learn React from scratch?',
  'Study plan for AWS Cloud certification',
  'Best resources for learning Python data science',
  'Help me prepare for a coding interview',
];

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function LearningPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    const msg = input;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setIsSending(true);
    try {
      const { data } = await chatAPI.sendMessage({ message: msg, mode: 'learning' });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    }
    setIsSending(false);
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-pink-400" /> Learning Assistant
        </h1>
        <p className="text-surface-200/40 text-sm mt-1">AI-generated learning roadmaps, study plans, and resources</p>
      </div>

      <div className="card !border-primary-500/10">
        <h3 className="text-sm font-semibold text-primary-400 mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> What do you want to learn?
        </h3>
        <div className="flex gap-3">
          <input value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="input-field text-sm flex-1" placeholder="Enter a topic or skill..." />
          <button onClick={handleSend} disabled={isSending} className="btn-primary text-sm flex items-center gap-2">
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {suggestions.map(s => (
            <button key={s} onClick={() => setInput(s)}
              className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-surface-200/50 hover:text-white hover:bg-white/10 transition-all">
              {s}
            </button>
          ))}
        </div>
      </div>

      {messages.length > 0 && (
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`card ${msg.role === 'user' ? '!bg-primary-500/5' : ''}`}>
              <div className="flex items-center gap-2 mb-3">
                {msg.role === 'assistant' ? <Sparkles className="w-4 h-4 text-primary-400" /> : null}
                <span className="text-xs text-surface-200/40 uppercase tracking-wider">
                  {msg.role === 'user' ? 'Your Request' : 'AI Learning Plan'}
                </span>
              </div>
              <div className="prose prose-invert prose-sm max-w-none text-surface-200/70">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      )}

      {isSending && (
        <div className="card">
          <div className="flex items-center gap-2 text-surface-200/50">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Generating your learning plan...</span>
          </div>
        </div>
      )}
    </div>
  );
}
