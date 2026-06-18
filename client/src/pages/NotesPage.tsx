import { useEffect, useState } from 'react';
import { notesAPI } from '../lib/api';
import { Plus, Search, StickyNote, Trash2, Sparkles, Loader2, Pin, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  folder?: string;
  is_pinned: boolean;
  ai_summary?: string;
  updated_at: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const fetchNotes = async () => {
    try {
      const { data } = await notesAPI.getAll();
      setNotes(data.notes || []);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotes();
  }, []);

  const createNote = async () => {
    if (!newTitle.trim()) return;
    try {
      await notesAPI.create({ title: newTitle, content: newContent });
      setNewTitle(''); setNewContent(''); setShowCreate(false);
      toast.success('Note created!');
      fetchNotes();
    } catch { toast.error('Failed to create note'); }
  };

  const deleteNote = async (id: string) => {
    try {
      await notesAPI.delete(id);
      if (selectedNote?.id === id) setSelectedNote(null);
      toast.success('Note deleted');
      fetchNotes();
    } catch { toast.error('Failed to delete'); }
  };

  const summarizeNote = async (id: string) => {
    setAiLoading(true);
    try {
      const { data } = await notesAPI.aiSummarize(id);
      toast.success('Summary generated!');
      if (selectedNote?.id === id) {
        setSelectedNote({ ...selectedNote, ai_summary: data.analysis?.summary || data.analysis });
      }
      fetchNotes();
    } catch { toast.error('Summarization failed'); }
    setAiLoading(false);
  };

  const togglePin = async (note: Note) => {
    try {
      await notesAPI.update(note.id, { is_pinned: !note.is_pinned });
      if (selectedNote?.id === note.id) {
        setSelectedNote({ ...selectedNote, is_pinned: !note.is_pinned });
      }
      toast.success(note.is_pinned ? 'Note unpinned' : 'Note pinned');
      fetchNotes();
    } catch { toast.error('Failed to update note'); }
  };

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  const pinned = filtered.filter(n => n.is_pinned);
  const unpinned = filtered.filter(n => !n.is_pinned);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <StickyNote className="w-6 h-6 text-amber-400" /> Notes
          </h1>
          <p className="text-surface-200/40 text-sm mt-1">{notes.length} notes</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm flex items-center gap-2 self-start">
          <Plus className="w-4 h-4" /> New Note
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-200/30" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10 !py-2.5 text-sm" placeholder="Search notes..." />
      </div>

      {showCreate && (
        <div className="card !border-primary-500/20 space-y-4 mb-6">
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="input-field text-sm" placeholder="Note title..." />
          <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} className="input-field text-sm" placeholder="Write your note..." rows={6} />
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowCreate(false)} className="btn-ghost text-sm">Cancel</button>
            <button onClick={createNote} className="btn-primary text-sm">Save Note</button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Notes List */}
        <div className="lg:col-span-1 space-y-2">
          {loading ? (
            [1,2,3].map(i => <div key={i} className="skeleton h-20 w-full rounded-xl" />)
          ) : filtered.length === 0 ? (
            <div className="card flex flex-col items-center py-12 text-surface-200/30">
              <StickyNote className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No notes yet</p>
            </div>
          ) : (
            <>
              {pinned.length > 0 && (
                <p className="text-xs text-surface-200/30 uppercase tracking-wider flex items-center gap-1">
                  <Pin className="w-3 h-3" /> Pinned
                </p>
              )}
              {pinned.map(note => (
                <NoteCard key={note.id} note={note} selected={selectedNote?.id === note.id}
                  onClick={() => setSelectedNote(note)} onDelete={() => deleteNote(note.id)} onTogglePin={() => togglePin(note)} />
              ))}
              {unpinned.length > 0 && pinned.length > 0 && (
                <p className="text-xs text-surface-200/30 uppercase tracking-wider mt-4">All Notes</p>
              )}
              {unpinned.map(note => (
                <NoteCard key={note.id} note={note} selected={selectedNote?.id === note.id}
                  onClick={() => setSelectedNote(note)} onDelete={() => deleteNote(note.id)} onTogglePin={() => togglePin(note)} />
              ))}
            </>
          )}
        </div>

        {/* Note Detail */}
        <div className="lg:col-span-2">
          {selectedNote ? (
            <div className="card sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">{selectedNote.title}</h2>
                <div className="flex gap-2">
                  <button onClick={() => togglePin(selectedNote)}
                    className="btn-secondary text-xs flex items-center gap-1.5">
                    <Pin className="w-3 h-3" /> {selectedNote.is_pinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button onClick={() => summarizeNote(selectedNote.id)} disabled={aiLoading}
                    className="btn-secondary text-xs flex items-center gap-1.5">
                    {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AI Summarize
                  </button>
                  <button onClick={() => setSelectedNote(null)} className="p-2 rounded-lg hover:bg-white/5">
                    <X className="w-4 h-4 text-surface-200/30" />
                  </button>
                </div>
              </div>
              {selectedNote.ai_summary && (
                <div className="p-3 rounded-xl bg-primary-500/5 border border-primary-500/10 mb-4">
                  <p className="text-xs text-primary-400 font-medium mb-1">AI Summary</p>
                  <p className="text-sm text-surface-200/70">{selectedNote.ai_summary}</p>
                </div>
              )}
              <div className="text-sm text-surface-200/60 whitespace-pre-wrap leading-relaxed">
                {selectedNote.content}
              </div>
              {selectedNote.tags?.length > 0 && (
                <div className="flex gap-2 mt-4 flex-wrap">
                  {selectedNote.tags.map(tag => (
                    <span key={tag} className="badge badge-primary">{tag}</span>
                  ))}
                </div>
              )}
              <p className="text-xs text-surface-200/20 mt-4">
                Updated {new Date(selectedNote.updated_at).toLocaleString()}
              </p>
            </div>
          ) : (
            <div className="card flex flex-col items-center py-16 text-surface-200/30">
              <StickyNote className="w-12 h-12 mb-3 opacity-30" />
              <p>Select a note to view</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NoteCard({ note, selected, onClick, onDelete, onTogglePin }: {
  note: Note; selected: boolean; onClick: () => void; onDelete: () => void; onTogglePin: () => void;
}) {
  return (
    <div onClick={onClick}
      className={`card !p-4 cursor-pointer group ${selected ? '!border-primary-500/30 glow-primary' : ''}`}>
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-medium text-white truncate flex-1 flex items-center gap-1.5">
          {note.is_pinned && <Pin className="w-3 h-3 text-amber-400 flex-shrink-0" />}
          {note.title}
        </h3>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
          <button onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
            className="p-1 rounded hover:bg-amber-500/20 text-surface-200/30 hover:text-amber-400">
            <Pin className="w-3 h-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded hover:bg-red-500/20 text-surface-200/30 hover:text-red-400">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      <p className="text-xs text-surface-200/30 mt-1 line-clamp-2">{note.content}</p>
      <p className="text-[10px] text-surface-200/20 mt-2">{new Date(note.updated_at).toLocaleDateString()}</p>
    </div>
  );
}
