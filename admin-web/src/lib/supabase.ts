// Same Supabase project as the mobile app, same Firebase-ID-token-as-bearer
// pattern (see src/services/supabase.ts in the mobile app) so RLS's
// `auth.jwt() ->> 'sub'` resolves the same Firebase UID here as there. This
// is what lets the admin-only RLS policies on `suppliers` / `admin_audit_log`
// (supabase/15_admin_and_market.sql) recognize this app's requests.
import { createClient } from '@supabase/supabase-js';
import { auth } from './firebase';

const SUPABASE_URL = 'https://cljzmisdceuxuzbwmnrz.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsanptaXNkY2V1eHV6YndtbnJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NTk0NjksImV4cCI6MjEwMjAzNTQ2OX0.xH-qOsLoGtN1DUj1NYi7UAYpW7XNP8qp9A8o3Ucmsr8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  accessToken: async () => {
    const user = auth.currentUser;
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch {
      return null;
    }
  },
});

export interface Supplier {
  id: string;
  name: string;
  category: string;
  location: string;
  price_range: string | null;
  price_level: string | null;
  phone: string | null;
  image_url: string | null;
  lat: number | null;
  lng: number | null;
  status: 'published' | 'hidden';
  curated_by: string | null;
  created_at?: string;
}

export const fetchSuppliers = async () => {
  const { data, error } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false });
  return { data: data as Supplier[] | null, error };
};

export const createSupplier = async (
  supplier: Omit<Supplier, 'id' | 'created_at'>,
  adminId: string
) => {
  const { data, error } = await supabase
    .from('suppliers')
    .insert({ ...supplier, curated_by: adminId })
    .select()
    .single();

  if (!error && data) {
    await writeAuditLog(adminId, 'create_supplier', 'suppliers', data.id, { name: supplier.name });
  }
  return { data: data as Supplier | null, error };
};

export const updateSupplier = async (
  id: string,
  updates: Partial<Omit<Supplier, 'id' | 'created_at'>>,
  adminId: string
) => {
  const { data, error } = await supabase.from('suppliers').update(updates).eq('id', id).select().single();

  if (!error && data) {
    await writeAuditLog(adminId, 'update_supplier', 'suppliers', id, updates);
  }
  return { data: data as Supplier | null, error };
};

export const deleteSupplier = async (id: string, adminId: string) => {
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (!error) {
    await writeAuditLog(adminId, 'delete_supplier', 'suppliers', id, {});
  }
  return { error };
};

const writeAuditLog = async (
  adminId: string,
  action: string,
  targetTable: string,
  targetId: string,
  details: Record<string, unknown>
) => {
  const { error } = await supabase
    .from('admin_audit_log')
    .insert({ admin_id: adminId, action, target_table: targetTable, target_id: targetId, details });
  if (error) console.warn('Audit log write failed:', error);
};

export const fetchAuditLog = async () => {
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  return { data, error };
};

/** Checked once after Firebase login, before granting portal access. Relies
 *  on the `profiles_owner_select` RLS policy already letting a user read
 *  their own row — is_admin included — so no service-role key is needed
 *  here; a non-admin simply reads their own `is_admin: false`. */
export const checkIsAdmin = async (uid: string): Promise<boolean> => {
  const { data, error } = await supabase.from('profiles').select('is_admin').eq('id', uid).maybeSingle();
  if (error || !data) return false;
  return Boolean((data as { is_admin: boolean }).is_admin);
};
