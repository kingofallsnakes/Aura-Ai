import { useState, useRef } from 'react';
import { chatAPI } from '../lib/api';
import { FileText, Send, Loader2, Sparkles, Mail, Upload } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function ResumePage() {
  const [activeTab, setActiveTab] = useState<'resume' | 'email'>('resume');
  const [input, setInput] = useState('');
  const [resumeContent, setResumeContent] = useState('');
  const [emailContext, setEmailContext] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { data } = await chatAPI.parseResume(file);
      setResumeContent(data.text);
      setInput('Analyze my resume'); // Auto-populate prompt for convenience
    } catch {
      alert('Failed to parse resume file. Please try pasting the text instead.');
    } finally {
      setIsUploading(false);
      // Reset input so they can upload again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    const mode = activeTab === 'resume' ? 'resume' : 'email';
    const msg = input;
    const context = activeTab === 'resume' ? { resumeContent } : { emailContext };
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setIsSending(true);
    try {
      const { data } = await chatAPI.sendMessage({ message: msg, mode, context });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    }
    setIsSending(false);
  };

  const handleTabChange = (tab: 'resume' | 'email') => {
    setActiveTab(tab);
    setMessages([]);
    setInput('');
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          {activeTab === 'resume' ? <FileText className="w-6 h-6 text-cyan-400" /> : <Mail className="w-6 h-6 text-orange-400" />}
          {activeTab === 'resume' ? 'Resume Assistant' : 'Email Assistant'}
        </h1>
        <p className="text-surface-200/40 text-sm mt-1">
          {activeTab === 'resume' ? 'AI-powered resume improvements and ATS optimization' : 'Professional email composition and formatting'}
        </p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => handleTabChange('resume')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2
            ${activeTab === 'resume' ? 'bg-primary-500/20 text-primary-400' : 'bg-white/5 text-surface-200/40 hover:text-white'}`}>
          <FileText className="w-4 h-4" /> Resume
        </button>
        <button onClick={() => handleTabChange('email')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2
            ${activeTab === 'email' ? 'bg-primary-500/20 text-primary-400' : 'bg-white/5 text-surface-200/40 hover:text-white'}`}>
          <Mail className="w-4 h-4" /> Email
        </button>
      </div>

      <div className="card !border-primary-500/10 space-y-4">
        {activeTab === 'resume' ? (
          <>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs text-surface-200/40">Upload or paste your resume content</label>
                <div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept=".pdf,.docx,.txt" 
                    className="hidden" 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-1 px-3 py-1 bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 text-xs rounded-md transition-colors"
                  >
                    {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    {isUploading ? 'Parsing...' : 'Upload File'}
                  </button>
                </div>
              </div>
              <textarea value={resumeContent} onChange={(e) => setResumeContent(e.target.value)}
                className="input-field text-sm" rows={4} placeholder="Paste your resume text here, or use the upload button..." />
            </div>
            <div>
              <label className="block text-xs text-surface-200/40 mb-2">What would you like help with?</label>
              <div className="flex gap-3">
                <input value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="input-field text-sm flex-1" placeholder="e.g., Improve my resume for a software engineering role" />
                <button onClick={handleSend} disabled={isSending} className="btn-primary text-sm">
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {['Analyze my resume', 'Suggest improvements', 'Optimize for ATS', 'Write a summary', 'Recommend skills to add'].map(s => (
                <button key={s} onClick={() => setInput(s)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-surface-200/50 hover:text-white hover:bg-white/10 transition-all">
                  {s}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-xs text-surface-200/40 mb-2">Email context (optional)</label>
              <textarea value={emailContext} onChange={(e) => setEmailContext(e.target.value)}
                className="input-field text-sm" rows={3} placeholder="Provide context: who you're writing to, purpose, tone..." />
            </div>
            <div>
              <label className="block text-xs text-surface-200/40 mb-2">What kind of email do you need?</label>
              <div className="flex gap-3">
                <input value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="input-field text-sm flex-1" placeholder="e.g., Write a follow-up email for a job interview" />
                <button onClick={handleSend} disabled={isSending} className="btn-primary text-sm">
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {['Professional introduction', 'Follow-up email', 'Meeting request', 'Thank you note', 'Formal response'].map(s => (
                <button key={s} onClick={() => setInput(s)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-surface-200/50 hover:text-white hover:bg-white/10 transition-all">
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {messages.length > 0 && (
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`card ${msg.role === 'user' ? '!bg-primary-500/5' : ''}`}>
              <div className="flex items-center gap-2 mb-3">
                {msg.role === 'assistant' ? <Sparkles className="w-4 h-4 text-primary-400" /> : null}
                <span className="text-xs text-surface-200/40 uppercase tracking-wider">
                  {msg.role === 'user' ? 'Your Request' : 'AI Response'}
                </span>
              </div>
              <div className="prose prose-invert prose-sm max-w-none text-surface-200/70">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
