import { useEffect, useState } from 'react';
import { tasksAPI } from '../lib/api';
import { Plus, Search, CheckSquare, Clock, Trash2, Sparkles, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import AIResultPanel from '../components/ui/AIResultPanel';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  tags: string[];
  created_at: string;
}

const priorityColors: Record<string, string> = {
  low: 'badge-primary',
  medium: 'badge-warning',
  high: 'badge-danger',
  urgent: 'bg-red-500/20 text-red-300',
};

const statusIcons: Record<string, React.ReactNode> = {
  todo: <div className="w-4 h-4 rounded-full border-2 border-surface-200/30" />,
  in_progress: <Clock className="w-4 h-4 text-amber-400" />,
  done: <CheckSquare className="w-4 h-4 text-emerald-400" />,
  cancelled: <X className="w-4 h-4 text-surface-200/30" />,
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [dailyPlan, setDailyPlan] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<{ taskId: string; data: Record<string, unknown> } | null>(null);

  const fetchTasks = async () => {
    try {
      const { data } = await tasksAPI.getAll();
      setTasks(data.tasks || []);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTasks();
  }, []);

  const createTask = async () => {
    if (!newTitle.trim()) return;
    try {
      await tasksAPI.create({ title: newTitle, description: newDesc, priority: newPriority });
      setNewTitle(''); setNewDesc(''); setShowCreate(false);
      toast.success('Task created!');
      fetchTasks();
    } catch { toast.error('Failed to create task'); }
  };

  const toggleStatus = async (task: Task) => {
    const next = task.status === 'done' ? 'todo' : task.status === 'todo' ? 'in_progress' : 'done';
    try {
      await tasksAPI.update(task.id, { status: next });
      fetchTasks();
    } catch { toast.error('Failed to update task'); }
  };

  const deleteTask = async (id: string) => {
    try {
      await tasksAPI.delete(id);
      toast.success('Task deleted');
      fetchTasks();
    } catch { toast.error('Failed to delete task'); }
  };

  const aiBreakdown = async (id: string) => {
    setAiLoading(id);
    try {
      const { data } = await tasksAPI.aiBreakdown(id);
      setBreakdown({ taskId: id, data: data.breakdown });
      toast.success('AI breakdown generated!');
    } catch { toast.error('AI breakdown failed'); }
    setAiLoading(null);
  };

  const createSubtasks = async () => {
    if (!breakdown?.data.subtasks || !Array.isArray(breakdown.data.subtasks)) return;
    try {
      for (const subtask of breakdown.data.subtasks as Array<{ title: string; priority?: string }>) {
        await tasksAPI.create({
          title: subtask.title,
          priority: subtask.priority || 'medium',
          parent_task_id: breakdown.taskId,
        });
      }
      toast.success('Subtasks created!');
      setBreakdown(null);
      fetchTasks();
    } catch { toast.error('Failed to create subtasks'); }
  };

  const generateDailyPlan = async () => {
    setAiLoading('daily');
    try {
      const { data } = await tasksAPI.aiDailyPlan();
      setDailyPlan(data.plan);
    } catch { toast.error('Failed to generate plan'); }
    setAiLoading(null);
  };

  const filtered = tasks.filter((t) => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-primary-400" /> Task Manager
          </h1>
          <p className="text-surface-200/40 text-sm mt-1">{tasks.length} tasks total</p>
        </div>
        <div className="flex gap-3">
          <button onClick={generateDailyPlan} className="btn-secondary text-sm flex items-center gap-2" disabled={aiLoading === 'daily'}>
            {aiLoading === 'daily' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            AI Daily Plan
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>
      </div>

      {/* Daily Plan */}
      {dailyPlan && (
        <div className="card !bg-primary-500/5 !border-primary-500/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-primary-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> AI Daily Plan
            </h3>
            <button onClick={() => setDailyPlan(null)} className="text-surface-200/30 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="prose prose-invert prose-sm max-w-none text-surface-200/70">
            <pre className="whitespace-pre-wrap text-sm">{dailyPlan}</pre>
          </div>
        </div>
      )}

      {/* AI Breakdown */}
      {breakdown && (
        <AIResultPanel
          title="AI Task Breakdown"
          data={breakdown.data}
          onClose={() => setBreakdown(null)}
          actions={
            Array.isArray(breakdown.data.subtasks) && breakdown.data.subtasks.length > 0 ? (
              <button onClick={createSubtasks} className="btn-primary text-sm">
                Create {breakdown.data.subtasks.length} Subtasks
              </button>
            ) : undefined
          }
        />
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-200/30" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10 !py-2.5 text-sm" placeholder="Search tasks..."
          />
        </div>
        <div className="flex gap-2">
          {['all', 'todo', 'in_progress', 'done'].map((f) => (
            <button
              key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all
                ${filter === f ? 'bg-primary-500/20 text-primary-400' : 'bg-white/5 text-surface-200/40 hover:text-white'}`}
            >
              {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="card !border-primary-500/20 space-y-4">
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="input-field text-sm" placeholder="Task title..." />
          <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="input-field text-sm" placeholder="Description (optional)" rows={2} />
          <div className="flex items-center gap-3">
            <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} className="input-field text-sm !w-auto">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <div className="flex-1" />
            <button onClick={() => setShowCreate(false)} className="btn-ghost text-sm">Cancel</button>
            <button onClick={createTask} className="btn-primary text-sm">Create</button>
          </div>
        </div>
      )}

      {/* Task List */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-16 w-full rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-surface-200/30">
          <CheckSquare className="w-12 h-12 mb-3 opacity-30" />
          <p>No tasks found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => (
            <div key={task.id} className="card !p-4 flex items-center gap-4 group">
              <button onClick={() => toggleStatus(task)} className="flex-shrink-0">{statusIcons[task.status]}</button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${task.status === 'done' ? 'text-surface-200/30 line-through' : 'text-white'}`}>
                  {task.title}
                </p>
                {task.description && <p className="text-xs text-surface-200/30 mt-0.5 truncate">{task.description}</p>}
              </div>
              <span className={`badge ${priorityColors[task.priority]} text-[10px]`}>{task.priority}</span>
              {task.due_date && (
                <span className="text-xs text-surface-200/30 hidden sm:block">
                  {new Date(task.due_date).toLocaleDateString()}
                </span>
              )}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => aiBreakdown(task.id)} className="p-1.5 rounded-lg hover:bg-primary-500/20 text-surface-200/30 hover:text-primary-400" title="AI Breakdown">
                  {aiLoading === task.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => deleteTask(task.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-surface-200/30 hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
