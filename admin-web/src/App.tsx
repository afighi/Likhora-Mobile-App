import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { logoutFirebase } from './lib/firebase';
import Login from './pages/Login';
import AccessDenied from './pages/AccessDenied';
import Suppliers from './pages/Suppliers';
import AuditLog from './pages/AuditLog';

function Shell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-lg text-sm font-semibold ${isActive ? 'bg-brand text-white' : 'text-inkSoft hover:bg-black/5'}`;

  return (
    <div className="min-h-screen bg-parchment">
      <header className="bg-white border-b border-line">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-sm">
              L
            </div>
            <span className="font-bold text-ink">LikhAI Admin</span>
            <nav className="ml-4 flex gap-1">
              <NavLink to="/suppliers" className={linkClass}>
                Suppliers
              </NavLink>
              <NavLink to="/audit-log" className={linkClass}>
                Activity Log
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-inkSoft">{user?.email}</span>
            <button
              onClick={() => logoutFirebase()}
              className="text-xs font-semibold text-danger"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

function Gate() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment">
        <p className="text-sm text-inkSoft">Loading…</p>
      </div>
    );
  }

  if (!user) return <Login />;
  if (!isAdmin) return <AccessDenied />;

  return (
    <Shell>
      <Routes>
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/audit-log" element={<AuditLog />} />
        <Route path="*" element={<Navigate to="/suppliers" replace />} />
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
