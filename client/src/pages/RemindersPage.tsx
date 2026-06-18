import { useEffect, useState } from 'react';
import { remindersAPI } from '../lib/api';
import { Plus, Bell, Trash2, Check, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface Reminder {
  id: string; title: string; description?: string; remind_at: string;
  status: string; repeat: string; priority: string;
}

const priorityDot: Record<string, string> = {
  low: 'bg-blue-400', medium: 'bg-amber-400', high: 'bg-red-400',
};

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [filter, setFilter] = useState('pending');

  const fetchReminders = async () => {
    try { const { data } = await remindersAPI.getAll(); setReminders(data.reminders || []); }
    catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReminders();
  }, []);

  const createReminder = async () => {
    if (!newTitle.trim() || !newDate) return;
    try {
      await remindersAPI.create({ title: newTitle, remind_at: new Date(newDate).toISOString(), priority: newPriority });
      setNewTitle(''); setNewDate(''); setShowCreate(false);
      toast.success('Reminder created!'); fetchReminders();
      window.dispatchEvent(new Event('reminders-updated'));
    } catch { toast.error('Failed to create'); }
  };

  const completeReminder = async (id: string) => {
    try { 
      await remindersAPI.complete(id); 
      toast.success('Completed!'); 
      fetchReminders(); 
      window.dispatchEvent(new Event('reminders-updated'));
    }
    catch { toast.error('Failed'); }
  };

  const deleteReminder = async (id: string) => {
    try { 
      await remindersAPI.delete(id); 
      toast.success('Deleted'); 
      fetchReminders(); 
      window.dispatchEvent(new Event('reminders-updated'));
    }
    catch { toast.error('Failed'); }
  };

  const filtered = filter === 'all' ? reminders : reminders.filter(r => r.status === filter);

  const isOverdue = (r: Reminder) => r.status === 'pending' && new Date(r.remind_at) < new Date();

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-purple-400" /> Reminders
          </h1>
          <p className="text-surface-200/40 text-sm mt-1">
            {reminders.filter(r => r.status === 'pending').length} pending
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm flex items-center gap-2 self-start">
          <Plus className="w-4 h-4" /> New Reminder
        </button>
      </div>

      <div className="flex gap-2">
        {['pending', 'completed', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all
              ${filter === f ? 'bg-primary-500/20 text-primary-400' : 'bg-white/5 text-surface-200/40 hover:text-white'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {showCreate && (
        <div className="card !border-primary-500/20 space-y-4">
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="input-field text-sm" placeholder="Reminder title..." />
          <input type="datetime-local" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="input-field text-sm" />
          <div className="flex items-center gap-3">
            <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} className="input-field text-sm !w-auto">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <div className="flex-1" />
            <button onClick={() => setShowCreate(false)} className="btn-ghost text-sm">Cancel</button>
            <button onClick={createReminder} className="btn-primary text-sm">Create</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-surface-200/30">
          <Bell className="w-12 h-12 mb-3 opacity-30" /><p>No reminders</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.id} className={`card !p-4 flex items-center gap-4 group ${isOverdue(r) ? '!border-red-500/20' : ''}`}>
              <div className={`w-2 h-2 rounded-full ${priorityDot[r.priority]} flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${r.status === 'completed' ? 'text-surface-200/30 line-through' : 'text-white'}`}>
                  {r.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3 text-surface-200/30" />
                  <span className={`text-xs ${isOverdue(r) ? 'text-red-400' : 'text-surface-200/30'}`}>
                    {new Date(r.remind_at).toLocaleString()}
                    {isOverdue(r) && ' — Overdue'}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {r.status === 'pending' && (
                  <button onClick={() => completeReminder(r.id)} className="p-1.5 rounded-lg hover:bg-green-500/20 text-surface-200/30 hover:text-green-400">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => deleteReminder(r.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-surface-200/30 hover:text-red-400">
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
