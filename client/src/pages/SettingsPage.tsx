import { useEffect, useState } from 'react';
import { settingsAPI } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { Settings, User, Cpu, Palette, Bell, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { profile } = useAuthStore();
  const { theme, setTheme, aiMode, setAIMode } = useSettingsStore();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [saving, setSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [aiStatus, setAiStatus] = useState<{ cloudAvailable: boolean; localAvailable: boolean } | null>(null);

  useEffect(() => {
    settingsAPI.get().then(({ data }) => {
      if (data.settings?.notifications_enabled !== undefined) {
        setNotificationsEnabled(data.settings.notifications_enabled);
      }
      if (data.settings?.theme) setTheme(data.settings.theme);
      if (data.settings?.ai_mode) setAIMode(data.settings.ai_mode);
    }).catch(() => {});
    settingsAPI.getAIStatus().then(({ data }) => setAiStatus(data)).catch(() => {});
  }, [setTheme, setAIMode]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await settingsAPI.updateProfile({ full_name: fullName, bio });
      toast.success('Profile updated!');
    } catch { toast.error('Failed to update profile'); }
    setSaving(false);
  };

  const saveSettings = async (data: Record<string, unknown>) => {
    try {
      await settingsAPI.update(data);
      toast.success('Settings saved!');
    } catch { toast.error('Failed to save settings'); }
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Settings className="w-6 h-6 text-primary-400" /> Settings
      </h1>

      {/* Profile */}
      <div className="card space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <User className="w-5 h-5 text-primary-400" /> Profile
        </h3>
        <div>
          <label className="block text-xs text-surface-200/40 mb-2">Full Name</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field text-sm" />
        </div>
        <div>
          <label className="block text-xs text-surface-200/40 mb-2">Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="input-field text-sm" rows={3} placeholder="Tell us about yourself..." />
        </div>
        <div>
          <label className="block text-xs text-surface-200/40 mb-2">Email</label>
          <input value={profile?.email || ''} disabled className="input-field text-sm opacity-50" />
        </div>
        <button onClick={saveProfile} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Profile
        </button>
      </div>

      {/* Theme */}
      <div className="card space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Palette className="w-5 h-5 text-pink-400" /> Appearance
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {(['dark', 'light', 'system'] as const).map(t => (
            <button key={t} onClick={() => { setTheme(t); saveSettings({ theme: t }); }}
              className={`p-4 rounded-xl border text-center transition-all
                ${theme === t ? 'border-primary-500/50 bg-primary-500/10' : 'border-white/5 bg-white/5 hover:border-white/10'}`}>
              <span className="text-sm font-medium text-white capitalize">{t}</span>
            </button>
          ))}
        </div>
      </div>

      {/* AI Configuration */}
      <div className="card space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cyan-400" /> AI Configuration
        </h3>
        {aiStatus && (
          <div className="flex gap-4 text-xs">
            <span className={`flex items-center gap-1.5 ${aiStatus.cloudAvailable ? 'text-green-400' : 'text-red-400'}`}>
              <div className={`w-2 h-2 rounded-full ${aiStatus.cloudAvailable ? 'bg-green-400' : 'bg-red-400'}`} />
              Cloud AI: {aiStatus.cloudAvailable ? 'Connected' : 'Unavailable'}
            </span>
            <span className={`flex items-center gap-1.5 ${aiStatus.localAvailable ? 'text-green-400' : 'text-surface-200/40'}`}>
              <div className={`w-2 h-2 rounded-full ${aiStatus.localAvailable ? 'bg-green-400' : 'bg-surface-200/20'}`} />
              Local AI: {aiStatus.localAvailable ? 'Running' : 'Not detected'}
            </span>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          {(['cloud', 'local', 'hybrid'] as const).map(m => (
            <button key={m} onClick={() => { setAIMode(m); saveSettings({ ai_mode: m }); }}
              className={`p-4 rounded-xl border text-center transition-all
                ${aiMode === m ? 'border-primary-500/50 bg-primary-500/10' : 'border-white/5 bg-white/5 hover:border-white/10'}`}>
              <span className="text-sm font-medium text-white capitalize">{m}</span>
              <p className="text-[10px] text-surface-200/30 mt-1">
                {m === 'cloud' ? 'OpenRouter' : m === 'local' ? 'Ollama' : 'Auto-fallback'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="card space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-400" /> Notifications
        </h3>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-surface-200/60">Enable notifications</span>
          <input
            type="checkbox"
            checked={notificationsEnabled}
            onChange={(e) => {
              setNotificationsEnabled(e.target.checked);
              saveSettings({ notifications_enabled: e.target.checked });
            }}
            className="accent-primary-500 w-4 h-4"
          />
        </label>
      </div>
    </div>
  );
}
