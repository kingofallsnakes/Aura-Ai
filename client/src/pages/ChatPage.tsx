import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../stores/chatStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send, Plus, Trash2, MessageSquare, BookOpen, CheckSquare,
  Target, GraduationCap, FileText, Mail, Loader2, Sparkles, Bot, User
} from 'lucide-react';

const modes = [
  { id: 'chat', label: 'General', icon: MessageSquare, color: 'text-blue-400' },
  { id: 'rag', label: 'Knowledge', icon: BookOpen, color: 'text-purple-400' },
  { id: 'task', label: 'Tasks', icon: CheckSquare, color: 'text-emerald-400' },
  { id: 'goal', label: 'Goals', icon: Target, color: 'text-amber-400' },
  { id: 'learning', label: 'Learning', icon: GraduationCap, color: 'text-pink-400' },
  { id: 'resume', label: 'Resume', icon: FileText, color: 'text-cyan-400' },
  { id: 'email', label: 'Email', icon: Mail, color: 'text-orange-400' },
];

export default function ChatPage() {
  const {
    sessions, currentSessionId, messages, isSending, activeMode,
    fetchSessions, fetchMessages, sendMessage, deleteSession, newChat, setActiveMode,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [showSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    const msg = input;
    setInput('');
    await sendMessage(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-56px)] lg:h-screen">
      {/* Chat Sidebar */}
      {showSidebar && (
        <div className="hidden md:flex w-72 flex-col glass border-r border-white/5 flex-shrink-0">
          <div className="p-4">
            <button onClick={newChat} className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> New Chat
            </button>
          </div>

          {/* Mode Selector */}
          <div className="px-4 pb-3">
            <p className="text-xs text-surface-200/30 uppercase tracking-wider mb-2">Mode</p>
            <div className="flex flex-wrap gap-1.5">
              {modes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setActiveMode(m.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all
                    ${activeMode === m.id ? 'bg-white/10 text-white' : 'text-surface-200/40 hover:text-surface-200/60 hover:bg-white/5'}`}
                  title={m.label}
                >
                  <m.icon className={`w-3 h-3 ${activeMode === m.id ? m.color : ''}`} />
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sessions */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all
                  ${currentSessionId === s.id ? 'bg-primary-500/10 text-white' : 'text-surface-200/50 hover:bg-white/5 hover:text-white'}`}
                onClick={() => fetchMessages(s.id)}
              >
                <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-50" />
                <span className="text-sm truncate flex-1">{s.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-surface-200/30 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 rounded-3xl gradient-primary flex items-center justify-center mb-6 glow-primary">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">AURA AI Chat</h2>
              <p className="text-surface-200/40 max-w-md mb-8">
                Ask me anything — productivity tips, code help, document analysis, or creative brainstorming.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
                {[
                  'Help me plan my week',
                  'Summarize my uploaded notes',
                  'Create a learning roadmap for React',
                  'Write a professional email',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                    className="p-3 rounded-xl bg-white/5 border border-white/5 text-sm text-surface-200/60 hover:text-white hover:border-primary-500/20 transition-all text-left"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-primary-500/20 text-white'
                    : 'glass text-surface-100'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-invert prose-sm max-w-none [&_pre]:bg-surface-900/50 [&_pre]:rounded-xl [&_code]:text-primary-300 [&_a]:text-primary-400">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-surface-700 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-4 h-4 text-surface-200/60" />
                  </div>
                )}
              </div>
            ))
          )}
          {isSending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="glass rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 text-surface-200/50">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 md:p-6 pt-0">
          <div className="glass rounded-2xl p-3 flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message AURA AI (${modes.find(m => m.id === activeMode)?.label} mode)...`}
              className="flex-1 bg-transparent text-white placeholder-surface-200/30 resize-none outline-none text-sm max-h-32 min-h-[40px] py-2"
              rows={1}
              id="chat-input"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              className="p-2.5 rounded-xl gradient-primary text-white disabled:opacity-30 transition-opacity flex-shrink-0"
              id="chat-send"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-surface-200/20 text-center mt-2">
            AURA AI may produce inaccurate information. Verify important facts.
          </p>
        </div>
      </div>
    </div>
  );
}
