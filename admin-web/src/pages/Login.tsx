import { useState } from 'react';
import { loginWithFirebase } from '../lib/firebase';
import { Lock, Mail, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await loginWithFirebase(email, password);
    } catch {
      setError('Could not sign in. Check your email and password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F4F8] px-4">
      <div className="w-full max-w-sm bg-white rounded-[22px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-[#E6DEE8] p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3.5 h-14 w-14 rounded-2xl bg-[#FAF8FA] border border-[#E6DEE8] flex items-center justify-center p-2 shadow-xs">
            <img src="/likhoralogo-mark.png" alt="LikhAI Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#1E1320]">LikhAI Admin Portal</h1>
          <p className="text-xs text-[#6E5D70] mt-1 font-medium">Sign in with verified administrator credentials</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1E1320] mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8C7A8E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] pl-9.5 pr-3.5 py-2.5 text-sm text-[#1E1320] outline-none transition-all focus:ring-2 focus:ring-[#42143E]/20 focus:border-[#42143E]"
                placeholder="admin@likhai.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E1320] mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8C7A8E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[#E6DEE8] bg-[#FAF8FA] pl-9.5 pr-3.5 py-2.5 text-sm text-[#1E1320] outline-none transition-all focus:ring-2 focus:ring-[#42143E]/20 focus:border-[#42143E]"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-[#DC2626]">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#42143E] hover:bg-[#310E2E] active:scale-[0.99] text-white font-semibold py-2.5 text-sm shadow-[0_4px_12px_rgba(66,20,62,0.2)] transition-all disabled:opacity-50 cursor-pointer mt-2"
          >
            {submitting ? 'Authenticating…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

