import { useEffect, useState } from 'react';
import { goalsAPI } from '../lib/api';
import { Plus, Target, Trash2, Sparkles, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import AIResultPanel from '../components/ui/AIResultPanel';

interface Goal {
  id: string; title: string; description?: string; category: string;
  status: string; progress: number; target_date?: string;
  milestones?: Array<{ title: string; completed: boolean }>;
}

const categoryColors: Record<string, string> = {
  learning: 'from-blue-500 to-cyan-500',
  career: 'from-emerald-500 to-green-500',
  project: 'from-amber-500 to-orange-500',
  personal: 'from-purple-500 to-violet-500',
  health: 'from-pink-500 to-rose-500',
  finance: 'from-indigo-500 to-blue-500',
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('learning');
  const [filter, setFilter] = useState('all');
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [review, setReview] = useState<Record<string, unknown> | null>(null);

  const fetchGoals = async () => {
    try { const { data } = await goalsAPI.getAll(); setGoals(data.goals || []); }
    catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGoals();
  }, []);

  const createGoal = async () => {
    if (!newTitle.trim()) return;
    try {
      await goalsAPI.create({ title: newTitle, description: newDesc, category: newCategory });
      setNewTitle(''); setNewDesc(''); setShowCreate(false);
      toast.success('Goal created!'); fetchGoals();
    } catch { toast.error('Failed to create goal'); }
  };

  const updateProgress = async (id: string, progress: number) => {
    try {
      await goalsAPI.update(id, { progress, ...(progress === 100 ? { status: 'completed' } : {}) });
      fetchGoals();
    } catch { toast.error('Failed to update'); }
  };

  const deleteGoal = async (id: string) => {
    try { await goalsAPI.delete(id); toast.success('Goal deleted'); fetchGoals(); }
    catch { toast.error('Failed to delete'); }
  };

  const aiReview = async (id: string) => {
    setAiLoading(id);
    try {
      const { data } = await goalsAPI.aiReview(id);
      setReview(data.review);
      toast.success('AI review generated!');
    } catch { toast.error('AI review failed'); }
    setAiLoading(null);
  };

  const filtered = filter === 'all' ? goals : goals.filter(g => g.status === filter);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-amber-400" /> Goal Tracker
          </h1>
          <p className="text-surface-200/40 text-sm mt-1">{goals.filter(g => g.status === 'active').length} active goals</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm flex items-center gap-2 self-start">
          <Plus className="w-4 h-4" /> New Goal
        </button>
      </div>

      {review && (
        <AIResultPanel title="AI Goal Review" data={review} onClose={() => setReview(null)} />
      )}

      <div className="flex gap-2">
        {['all', 'active', 'completed', 'paused'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all
              ${filter === f ? 'bg-primary-500/20 text-primary-400' : 'bg-white/5 text-surface-200/40 hover:text-white'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {showCreate && (
        <div className="card !border-primary-500/20 space-y-4">
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="input-field text-sm" placeholder="Goal title..." />
          <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="input-field text-sm" placeholder="Description..." rows={2} />
          <div className="flex items-center gap-3">
            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="input-field text-sm !w-auto">
              {Object.keys(categoryColors).map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
            <div className="flex-1" />
            <button onClick={() => setShowCreate(false)} className="btn-ghost text-sm">Cancel</button>
            <button onClick={createGoal} className="btn-primary text-sm">Create</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">{[1,2].map(i => <div key={i} className="skeleton h-48 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-surface-200/30">
          <Target className="w-12 h-12 mb-3 opacity-30" />
          <p>No goals found</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(goal => (
            <div key={goal.id} className="card group">
              <div className="flex items-start justify-between mb-3">
                <div className={`px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${categoryColors[goal.category]} text-white`}>
                  {goal.category}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => aiReview(goal.id)} className="p-1.5 rounded-lg hover:bg-primary-500/20 text-surface-200/30 hover:text-primary-400">
                    {aiLoading === goal.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => deleteGoal(goal.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-surface-200/30 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">{goal.title}</h3>
              {goal.description && <p className="text-xs text-surface-200/40 mb-4 line-clamp-2">{goal.description}</p>}
              <div className="mt-auto">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-surface-200/40">Progress</span>
                  <span className="text-white font-medium">{goal.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-3">
                  <div className={`h-full rounded-full bg-gradient-to-r ${categoryColors[goal.category]} transition-all duration-500`}
                    style={{ width: `${goal.progress}%` }} />
                </div>
                <input type="range" min="0" max="100" value={goal.progress}
                  onChange={(e) => updateProgress(goal.id, parseInt(e.target.value))}
                  className="w-full accent-primary-500 h-1" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
