import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { logoutFirebase } from './lib/firebase';
import Login from './pages/Login';
import AccessDenied from './pages/AccessDenied';
import Dashboard from './pages/Dashboard';
import Suppliers from './pages/Suppliers';
import CommunityRoadmaps from './pages/CommunityRoadmaps';
import UserRoadmaps from './pages/UserRoadmaps';
import CommunityForums from './pages/CommunityForums';
import AuditLog from './pages/AuditLog';
import {
  LayoutDashboard,
  Store,
  Compass,
  Users,
  MessageSquare,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

function Shell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  const getActiveTitle = () => {
    const p = location.pathname;
    if (p === '/' || p.includes('/dashboard')) return 'Executive Dashboard';
    if (p.includes('/suppliers')) return 'Suppliers Directory';
    if (p.includes('/community-roadmaps')) return 'Community Roadmaps';
    if (p.includes('/users')) return 'User Roadmaps & Directory';
    if (p.includes('/forums')) return 'Community Forums';
    if (p.includes('/audit')) return 'Audit Trail & Security Ledger';
    return 'Executive Dashboard';
  };

  const navItems = [
    { to: '/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    { to: '/suppliers', label: 'Suppliers Directory', icon: Store },
    { to: '/community-roadmaps', label: 'Community Roadmaps', icon: Compass },
    { to: '/users', label: 'User Roadmaps', icon: Users },
    { to: '/forums', label: 'Community Forums', icon: MessageSquare },
    { to: '/audit-trail', label: 'Audit Trail & Ledger', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-[#F5F4F8] flex text-[#1E1320]">
      {/* Left Sidebar */}
      <aside className="w-64 bg-white border-r border-[#E6DEE8] flex flex-col justify-between shrink-0 h-screen sticky top-0 z-40">
        <div>
          {/* Brand Header with App Logo */}
          <div className="p-5 flex items-center gap-3 border-b border-[#F4EFF5]">
            <div className="w-9 h-9 rounded-xl bg-[#FAF8FA] border border-[#E6DEE8] flex items-center justify-center p-1.5 shadow-xs shrink-0 overflow-hidden">
              <img src="/likhoralogo-mark.png" alt="LikhAI Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-bold text-[#1E1320] text-sm leading-tight tracking-tight">LikhAI Admin</h1>
              <p className="text-[11px] text-[#6E5D70] font-medium">Philippine MSME SaaS</p>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-[#42143E] text-white shadow-sm'
                        : 'text-[#6E5D70] hover:bg-[#F6F3F7] hover:text-[#1E1320]'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Bottom User Footer */}
        <div className="p-4 border-t border-[#F1ECF2]">
          <div className="bg-[#F8F6F9] rounded-xl p-3 border border-[#EAE4EC] shadow-xs">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#EAE2EC] text-[#42143E] flex items-center justify-center font-bold text-xs shrink-0">
                {(user?.email?.[0] || 'A').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#1E1320] truncate" title={user?.email || ''}>
                  {user?.email || 'admin@likhai.com'}
                </p>
                <p className="text-[10px] text-[#6E5D70] font-medium">Verified Administrator</p>
              </div>
            </div>
            <button
              onClick={() => logoutFirebase()}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#BE123C] hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F5F4F8] min-h-screen">
        {/* Top Sticky Header Bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-[#E6DEE8] px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#8C7A8E] font-medium">LikhAI Admin</span>
            <span className="text-[#C2B7C4]">/</span>
            <span className="text-[#1E1320] font-semibold">{getActiveTitle()}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-[#F6F3F7] rounded-full border border-[#E6DEE8] text-xs font-medium text-[#6E5D70]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live Portal Mode</span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

function Gate() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F4F8]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white border border-[#E6DEE8] p-2 shadow-sm flex items-center justify-center animate-pulse">
            <img src="/likhoralogo-mark.png" alt="LikhAI" className="w-full h-full object-contain" />
          </div>
          <p className="text-sm font-medium text-[#6E5D70]">Connecting to LikhAI Admin…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;
  if (!isAdmin) return <AccessDenied />;

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/community-roadmaps" element={<CommunityRoadmaps />} />
        <Route path="/users" element={<UserRoadmaps />} />
        <Route path="/forums" element={<CommunityForums />} />
        <Route path="/audit-trail" element={<AuditLog />} />
        <Route path="/audit-log" element={<AuditLog />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Shell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  );
}
