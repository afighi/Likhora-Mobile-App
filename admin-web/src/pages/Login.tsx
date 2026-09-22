import { useState } from 'react';
import { loginWithFirebase } from '../lib/firebase';

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
      // AuthContext's onAuthStateChanged listener picks up the new session
      // and runs the is_admin check; nothing else to do here.
    } catch {
      setError('Could not sign in. Check your email and password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-black/5 p-8"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-brand flex items-center justify-center text-white font-bold text-lg">
            L
          </div>
          <h1 className="text-lg font-bold text-ink">LikhAI Admin Portal</h1>
          <p className="text-sm text-inkSoft mt-1">Sign in with your admin account</p>
        </div>

        <label className="block text-xs font-semibold text-inkSoft mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 rounded-lg border border-line bg-inputBg px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          placeholder="admin@example.com"
        />

        <label className="block text-xs font-semibold text-inkSoft mb-1">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 rounded-lg border border-line bg-inputBg px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          placeholder="••••••••"
        />

        {error && <p className="text-sm text-danger mb-3">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand text-white font-semibold py-2.5 text-sm disabled:opacity-60"
        >
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
