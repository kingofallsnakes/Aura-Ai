import { useEffect, useState } from 'react';
import { adminAPI } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { Shield, Users, MessageSquare, FileText, Activity, HardDrive, TrendingUp } from 'lucide-react';

interface AdminStats {
  totalUsers: number; totalTasks: number; totalChatSessions: number;
  totalDocuments: number; totalStorageBytes: number; aiRequestsLast7Days: number;
}

export default function AdminPage() {
  const { profile } = useAuthStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; full_name: string; email: string; role: string; created_at: string }>>([]);
  const [logs, setLogs] = useState<Array<{ id: string; action: string; resource_type?: string; details?: Record<string, unknown>; created_at: string; user_id: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role !== 'admin') return;
    Promise.all([
      adminAPI.getStats().then(({ data }) => setStats(data.stats)),
      adminAPI.getUsers().then(({ data }) => setUsers(data.users || [])),
      adminAPI.getActivityLogs(30).then(({ data }) => setLogs(data.logs || [])),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, [profile]);

  if (profile?.role !== 'admin') {
    return (
      <div className="p-6 md:p-8 flex flex-col items-center justify-center min-h-[60vh] text-surface-200/30">
        <Shield className="w-16 h-16 mb-4 opacity-30" />
        <h2 className="text-xl font-bold text-white mb-2">Admin Access Required</h2>
        <p>You don't have permission to view this page.</p>
      </div>
    );
  }

  const formatStorage = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Shield className="w-6 h-6 text-red-400" /> Admin Dashboard
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { icon: Users, label: 'Total Users', value: stats?.totalUsers || 0, color: 'bg-blue-500/20' },
          { icon: MessageSquare, label: 'Chat Sessions', value: stats?.totalChatSessions || 0, color: 'bg-purple-500/20' },
          { icon: FileText, label: 'Documents', value: stats?.totalDocuments || 0, color: 'bg-emerald-500/20' },
          { icon: HardDrive, label: 'Storage Used', value: formatStorage(stats?.totalStorageBytes || 0), color: 'bg-amber-500/20' },
          { icon: TrendingUp, label: 'AI Requests (7d)', value: stats?.aiRequestsLast7Days || 0, color: 'bg-pink-500/20' },
          { icon: Activity, label: 'Total Tasks', value: stats?.totalTasks || 0, color: 'bg-cyan-500/20' },
        ].map(s => (
          <div key={s.label} className="card">
            <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-xl font-bold text-white">{loading ? '—' : s.value}</div>
            <div className="text-xs text-surface-200/40 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" /> Users
        </h3>
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-surface-200/30 text-xs uppercase tracking-wider">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => (
                  <tr key={u.id} className="text-surface-200/60">
                    <td className="py-3 pr-4 text-white font-medium">{u.full_name}</td>
                    <td className="py-3 pr-4">{u.email}</td>
                    <td className="py-3 pr-4">
                      <span className={`badge ${u.role === 'admin' ? 'badge-danger' : 'badge-primary'}`}>{u.role}</span>
                    </td>
                    <td className="py-3 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Activity Logs */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-400" /> Recent Activity
        </h3>
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-10 rounded-xl" />)}</div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-surface-200/30">No activity logs yet</p>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <span className="text-sm text-white font-medium">{log.action}</span>
                  {log.resource_type && (
                    <span className="text-xs text-surface-200/30 ml-2">({log.resource_type})</span>
                  )}
                </div>
                <span className="text-xs text-surface-200/30">{new Date(log.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
