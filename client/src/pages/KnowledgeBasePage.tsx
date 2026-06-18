import { useEffect, useState, useRef } from 'react';
import { knowledgeBaseAPI } from '../lib/api';
import { BookOpen, Upload, Trash2, Search, FileText, Loader2, Sparkles, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import AIResultPanel from '../components/ui/AIResultPanel';

interface Document {
  id: string; file_name: string; file_type: string; file_size: number;
  status: string; created_at: string;
}

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [querying, setQuerying] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    try { const { data } = await knowledgeBaseAPI.getDocuments(); setDocuments(data.documents || []); }
    catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDocs();
  }, []);

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await knowledgeBaseAPI.uploadDocument(file);
      toast.success('Document uploaded! Processing...');
      fetchDocs();
    } catch { toast.error('Upload failed'); }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const deleteDoc = async (id: string) => {
    try { await knowledgeBaseAPI.deleteDocument(id); toast.success('Deleted'); fetchDocs(); }
    catch { toast.error('Failed'); }
  };

  const handleQuery = async () => {
    if (!query.trim()) return;
    setQuerying(true);
    try {
      const { data } = await knowledgeBaseAPI.query(query);
      setAnswer(data.answer);
    } catch { toast.error('Query failed'); }
    setQuerying(false);
  };

  const analyzeDoc = async (id: string) => {
    setAnalyzing(id);
    try {
      const { data } = await knowledgeBaseAPI.analyzeDocument(id);
      setAnalysis(data.analysis);
      toast.success('Analysis complete!');
    } catch { toast.error('Analysis failed'); }
    setAnalyzing(null);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-purple-400" /> Knowledge Base
          </h1>
          <p className="text-surface-200/40 text-sm mt-1">Upload documents and ask AI questions about them</p>
        </div>
        <div>
          <input ref={fileRef} type="file" onChange={uploadFile} accept=".pdf,.docx,.txt,.md" className="hidden" id="kb-upload" />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="btn-primary text-sm flex items-center gap-2">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload Document
          </button>
        </div>
      </div>

      {analysis && (
        <AIResultPanel title="Document Analysis" data={analysis} onClose={() => setAnalysis(null)} />
      )}

      {/* Query Section */}
      <div className="card !border-primary-500/10">
        <h3 className="text-sm font-semibold text-primary-400 mb-3 flex items-center gap-2">
          <Search className="w-4 h-4" /> Ask Your Knowledge Base
        </h3>
        <div className="flex gap-3">
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
            className="input-field text-sm flex-1" placeholder="What is inside my uploaded notes?" />
          <button onClick={handleQuery} disabled={querying} className="btn-primary text-sm flex items-center gap-2">
            {querying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        {answer && (
          <div className="mt-4 p-4 rounded-xl bg-white/5 text-sm text-surface-200/70 whitespace-pre-wrap">
            {answer}
          </div>
        )}
      </div>

      {/* Documents */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Uploaded Documents</h3>
        {loading ? (
          <div className="space-y-3">{[1,2].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
        ) : documents.length === 0 ? (
          <div className="card flex flex-col items-center py-12 text-surface-200/30">
            <FileText className="w-12 h-12 mb-3 opacity-30" />
            <p>No documents uploaded yet</p>
            <p className="text-xs mt-1">Supports PDF, DOCX, TXT, and Markdown</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map(doc => (
              <div key={doc.id} className="card !p-4 flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{doc.file_name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-surface-200/30">{formatSize(doc.file_size)}</span>
                    <span className={`badge text-[10px] ${
                      doc.status === 'processed' ? 'badge-success' : doc.status === 'processing' ? 'badge-warning' : 'badge-danger'
                    }`}>{doc.status}</span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => analyzeDoc(doc.id)} className="p-1.5 rounded-lg hover:bg-primary-500/20 text-surface-200/30 hover:text-primary-400" title="AI Analyze">
                    {analyzing === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => deleteDoc(doc.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-surface-200/30 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
