import { logoutFirebase } from '../lib/firebase';
import { ShieldAlert, LogOut } from 'lucide-react';

export default function AccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F4F8] px-4">
      <div className="max-w-sm text-center bg-white rounded-[22px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-[#E6DEE8] p-8">
        <div className="mx-auto mb-3.5 h-12 w-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-[#DC2626] shadow-xs">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-[#1E1320]">Access Denied</h1>
        <p className="text-xs text-[#6E5D70] mt-2 leading-relaxed">
          This account is not authorized to use the LikhAI Admin Portal. Contact a super administrator to grant
          elevated role access.
        </p>
        <button
          onClick={() => logoutFirebase()}
          className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl border border-[#E6DEE8] bg-[#F6F3F7] hover:bg-[#EAE2EC] text-[#1E1320] font-semibold py-2.5 text-sm transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-[#BE123C]" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}

