import { logoutFirebase } from '../lib/firebase';

export default function AccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment px-4">
      <div className="max-w-sm text-center bg-white rounded-2xl shadow-sm border border-black/5 p-8">
        <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-danger/10 flex items-center justify-center text-danger font-bold text-lg">
          !
        </div>
        <h1 className="text-lg font-bold text-ink">Access Denied</h1>
        <p className="text-sm text-inkSoft mt-2">
          This account is not authorized to use the LikhAI Admin Portal. Ask an existing admin to grant
          your account access.
        </p>
        <button
          onClick={() => logoutFirebase()}
          className="mt-5 w-full rounded-lg border border-line text-ink font-semibold py-2.5 text-sm"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
