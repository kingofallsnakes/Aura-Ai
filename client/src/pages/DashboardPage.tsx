import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { settingsAPI } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import {
  CheckSquare, Target, StickyNote, Bell, MessageSquare,
  Zap, ArrowRight, Clock, AlertCircle, MapPin, Calendar
} from 'lucide-react';

function LiveStatusWidget() {
  const [time, setTime] = useState(new Date());
  const [location, setLocation] = useState<{ city: string; country: string } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Fetch generic location via IP
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data.city && data.country_name) {
          setLocation({ city: data.city, country: data.country_name });
        }
      })
      .catch(() => {
        // Fallback or ignore
      });
  }, []);

  return (
    <div className="card sticky top-6">
      <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <Zap className="w-5 h-5 text-primary-400" /> Live Status
      </h3>
      
      <div className="space-y-6">
        {/* Clock */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-surface-200/40">Current Time</p>
            <p className="text-xl font-bold text-white tracking-wider">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Date */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm text-surface-200/40">Today's Date</p>
            <p className="text-base font-semibold text-white">
              {time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <p className="text-sm text-surface-200/40">Location</p>
            <p className="text-base font-semibold text-white">
              {location ? `${location.city}, ${location.country}` : 'Detecting...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DashboardStats {
  totalTasks: number;
  tasksByStatus: { todo: number; in_progress: number; done: number };
  totalGoals: number;
  activeGoals: number;
  avgGoalProgress: number;
  totalNotes: number;
  pendingReminders: number;
  upcomingReminders: Array<{ id: string; title: string; remind_at: string }>;
  totalChatSessions: number;
}

function StatCard({ icon: Icon, label, value, color, link }: {
  icon: React.ElementType; label: string; value: string | number; color: string; link: string;
}) {
  return (
    <Link to={link} className="card group hover:glow-primary">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <ArrowRight className="w-4 h-4 text-surface-200/20 group-hover:text-primary-400 transition-colors" />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-surface-200/40 mt-1">{label}</div>
    </Link>
  );
}

export default function DashboardPage() {
  const { profile } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await settingsAPI.getDashboard();
        setStats(data.stats);
      } catch {
        // Use empty stats on error
        setStats({
          totalTasks: 0, tasksByStatus: { todo: 0, in_progress: 0, done: 0 },
          totalGoals: 0, activeGoals: 0, avgGoalProgress: 0,
          totalNotes: 0, pendingReminders: 0, upcomingReminders: [],
          totalChatSessions: 0,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto flex flex-col xl:flex-row gap-6 lg:gap-8">
      {/* Main Content (Left) */}
      <div className="flex-1 space-y-8 min-w-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {greeting()}, <span className="gradient-text">{profile?.full_name?.split(' ')[0] || 'there'}</span>
            </h1>
            <p className="text-surface-200/40 mt-1">Here's your productivity overview</p>
          </div>
          <Link to="/chat" className="btn-primary inline-flex items-center gap-2 self-start">
            <Zap className="w-4 h-4" /> Start AI Chat
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard icon={CheckSquare} label="Total Tasks" value={loading ? '—' : (stats?.totalTasks || 0)} color="bg-blue-500/20" link="/tasks" />
          <StatCard icon={Target} label="Active Goals" value={loading ? '—' : (stats?.activeGoals || 0)} color="bg-amber-500/20" link="/goals" />
          <StatCard icon={StickyNote} label="Notes" value={loading ? '—' : (stats?.totalNotes || 0)} color="bg-emerald-500/20" link="/notes" />
          <StatCard icon={Bell} label="Pending Reminders" value={loading ? '—' : (stats?.pendingReminders || 0)} color="bg-purple-500/20" link="/reminders" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upcoming Reminders */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" /> Upcoming Reminders
            </h3>
            {(stats?.upcomingReminders || []).length === 0 ? (
              <div className="flex flex-col items-center py-8 text-surface-200/30">
                <Bell className="w-10 h-10 mb-3 opacity-50" />
                <p className="text-sm">No upcoming reminders</p>
                <Link to="/reminders" className="text-xs text-primary-400 mt-2 hover:text-primary-300">Create one</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {(stats?.upcomingReminders || []).slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{r.title}</p>
                      <p className="text-xs text-surface-200/40">{new Date(r.remind_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary-400" /> Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'AI Chat', icon: MessageSquare, path: '/chat', color: 'from-blue-500/10 to-cyan-500/10' },
                { label: 'New Task', icon: CheckSquare, path: '/tasks', color: 'from-emerald-500/10 to-green-500/10' },
                { label: 'New Note', icon: StickyNote, path: '/notes', color: 'from-amber-500/10 to-orange-500/10' },
                { label: 'Upload Doc', icon: Target, path: '/knowledge-base', color: 'from-purple-500/10 to-violet-500/10' },
              ].map((a) => (
                <Link
                  key={a.label}
                  to={a.path}
                  className={`flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br ${a.color} border border-white/5 hover:border-primary-500/20 transition-all group`}
                >
                  <a.icon className="w-5 h-5 text-surface-200/60 group-hover:text-primary-400 transition-colors" />
                  <span className="text-sm text-surface-200/70 group-hover:text-white transition-colors">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-full xl:w-80 flex-shrink-0">
        <LiveStatusWidget />
      </div>
    </div>
  );
}
