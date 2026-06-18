import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import {
  LayoutDashboard, MessageSquare, CheckSquare, Target, StickyNote,
  Bell, BookOpen, GraduationCap, FileText, Settings, Shield,
  LogOut, Menu, X, ChevronLeft, Zap, Sun, Moon
} from 'lucide-react';
import RemindersDaemon from '../RemindersDaemon';
import ScreenSaver from '../ScreenSaver';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/chat', label: 'AI Chat', icon: MessageSquare },
  { path: '/tasks', label: 'Tasks', icon: CheckSquare },
  { path: '/notes', label: 'Notes', icon: StickyNote },
  { path: '/goals', label: 'Goals', icon: Target },
  { path: '/reminders', label: 'Reminders', icon: Bell },
  { path: '/knowledge-base', label: 'Knowledge Base', icon: BookOpen },
  { path: '/learning', label: 'Learning', icon: GraduationCap },
  { path: '/resume', label: 'Resume', icon: FileText },
];

const bottomItems = [
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/admin', label: 'Admin', icon: Shield, adminOnly: true },
];

export default function AppLayout() {
  const { profile, signOut } = useAuthStore();
  const { theme, setTheme, sidebarCollapsed, toggleSidebar } = useSettingsStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const effectiveTheme = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between p-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <span className="text-lg font-bold gradient-text whitespace-nowrap">AURA AI</span>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex p-1.5 rounded-lg hover:bg-white/5 text-surface-200/50 transition-colors"
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'active' : ''} ${sidebarCollapsed ? 'justify-center px-3' : ''}`
            }
            title={sidebarCollapsed ? item.label : undefined}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-1 border-t border-white/5 pt-4">
        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
          className={`sidebar-item w-full ${sidebarCollapsed ? 'justify-center px-3' : ''}`}
        >
          {effectiveTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          {!sidebarCollapsed && <span className="text-sm">{effectiveTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {bottomItems.map((item) => {
          if (item.adminOnly && profile?.role !== 'admin') return null;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'active' : ''} ${sidebarCollapsed ? 'justify-center px-3' : ''}`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
            </NavLink>
          );
        })}

        {/* User */}
        <div className={`flex items-center gap-3 p-3 rounded-xl bg-white/5 mt-2 ${sidebarCollapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0 text-white text-sm font-bold">
            {(profile?.full_name || 'U')[0].toUpperCase()}
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-surface-200/40 truncate">{profile?.email}</p>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-lg hover:bg-white/10 text-surface-200/50 hover:text-red-400 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-900 flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <aside
        className={`hidden lg:flex flex-col py-4 pl-4 pr-2 transition-all duration-300 flex-shrink-0 relative z-10
          ${sidebarCollapsed ? 'w-[88px]' : 'w-64'}`}
      >
        <div className="flex-1 glass rounded-2xl flex flex-col shadow-2xl overflow-hidden">
          {renderSidebarContent()}
        </div>
      </aside>

      {/* Sidebar - Mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 glass border-r border-white/5 transform transition-transform duration-300 lg:hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex justify-end p-3">
          <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-white/5">
            <X className="w-5 h-5 text-surface-200" />
          </button>
        </div>
        {renderSidebarContent()}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 lg:py-4 lg:pr-4 lg:pl-2">
        {/* Top Bar */}
        <header className="h-14 glass border-b border-white/5 flex items-center px-4 gap-4 flex-shrink-0 lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-white/5">
            <Menu className="w-5 h-5 text-surface-200" />
          </button>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-400" />
            <span className="font-bold gradient-text">AURA AI</span>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <RemindersDaemon />
          <ScreenSaver />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
