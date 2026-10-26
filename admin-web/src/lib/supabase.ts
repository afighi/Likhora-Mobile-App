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

// ==========================================
// 1. Types & Interfaces
// ==========================================

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

export interface SubStep {
  id: string;
  title: string;
  completed: boolean;
  desc?: string;
}

export interface RoadmapTask {
  id?: string;
  client_key?: string;
  user_id?: string;
  title: string;
  category: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Skipped';
  desc?: string;
  desc_text?: string;
  step_order?: number;
  sub_steps?: SubStep[];
  agency?: string;
  legal_basis?: string;
  required_docs?: string[];
  estimated_time?: string;
  estimated_cost?: string;
  tips?: string[];
}

export interface CommunityPost {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar_url?: string | null;
  business_name: string;
  business_type: string;
  location: string;
  summary: string;
  image_url: string;
  template_data: RoadmapTask[];
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  business_name?: string;
  business_type?: string;
  budget?: string;
  experience_level?: string;
  location?: string;
  launch_date?: string;
  onboarded?: boolean;
  avatar_url?: string | null;
  is_admin?: boolean;
  created_at?: string;
}

export interface ForumPost {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar_url?: string | null;
  business_type: string;
  topic: string;
  title: string;
  content: string;
  ai_advice?: string;
  statutory_ref?: string;
  is_pinned?: boolean;
  is_verified_solution?: boolean;
  helpful_votes?: number;
  created_at: string;
}

export interface ForumReply {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  author_avatar_url?: string | null;
  author_role: 'admin' | 'member';
  reply_text: string;
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  admin_id: string;
  action: string;
  target_table: string;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

// ==========================================
// 2. Audit Trail Logger
// ==========================================

export const writeAuditLog = async (
  adminId: string,
  action: string,
  targetTable: string,
  targetId: string,
  details: Record<string, unknown>
) => {
  try {
    const { error } = await supabase
      .from('admin_audit_log')
      .insert({ admin_id: adminId, action, target_table: targetTable, target_id: targetId, details });
    if (error) console.warn('Audit log write error:', error.message);
  } catch (err) {
    console.warn('Audit log exception:', err);
  }
};

export const fetchAuditLog = async () => {
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  return { data: (data as AuditLogRow[]) || [], error };
};

// ==========================================
// 3. Suppliers Management
// ==========================================

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

// ==========================================
// 4. Community Roadmaps (Templates in Community Tab)
// ==========================================

export const fetchCommunityPosts = async () => {
  const { data, error } = await supabase
    .from('community_posts')
    .select('*')
    .order('created_at', { ascending: false });
  return { data: (data as CommunityPost[]) || [], error };
};

export const createCommunityPost = async (
  post: {
    author_id: string;
    author_name: string;
    business_name: string;
    business_type: string;
    location: string;
    summary: string;
    image_url?: string;
    template_data: RoadmapTask[];
  },
  adminId: string
) => {
  const payload = {
    ...post,
    image_url: post.image_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('community_posts')
    .insert(payload)
    .select()
    .single();

  if (!error && data) {
    await writeAuditLog(adminId, 'publish_community_roadmap', 'community_posts', data.id, {
      business_name: post.business_name,
      tasks_count: post.template_data.length,
    });
  }
  return { data: data as CommunityPost | null, error };
};

export const updateCommunityPost = async (
  id: string,
  updates: Partial<CommunityPost>,
  adminId: string
) => {
  const { data, error } = await supabase
    .from('community_posts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (!error && data) {
    await writeAuditLog(adminId, 'update_community_roadmap', 'community_posts', id, updates);
  }
  return { data: data as CommunityPost | null, error };
};

export const deleteCommunityPost = async (id: string, adminId: string) => {
  const { error } = await supabase.from('community_posts').delete().eq('id', id);
  if (!error) {
    await writeAuditLog(adminId, 'delete_community_roadmap', 'community_posts', id, {});
  }
  return { error };
};

export const fetchAllUsers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  return { data: (data as UserProfile[]) || [], error };
};

export const updateUserProfile = async (
  userId: string,
  updates: Partial<UserProfile>,
  adminId: string
) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (!error && data) {
    await writeAuditLog(adminId, 'update_user_profile', 'profiles', userId, updates);
  }
  return { data, error };
};

export const fetchUserRoadmap = async (userId: string) => {
  const { data, error } = await supabase
    .from('roadmaps')
    .select('*')
    .eq('user_id', userId)
    .order('step_order', { ascending: true });

  const rawTasks: RoadmapTask[] = (data || []).map((t: any) => ({
    ...t,
    desc: t.desc_text || t.desc || '',
    sub_steps: t.sub_steps || [],
  }));

  // Deduplicate by normalized title so UI never shows ghost/redundant duplicate steps
  const seenTitles = new Set<string>();
  const deduplicated: RoadmapTask[] = [];

  rawTasks.forEach((t) => {
    const norm = (t.title || '').trim().toLowerCase();
    if (norm && !seenTitles.has(norm)) {
      seenTitles.add(norm);
      deduplicated.push({
        ...t,
        step_order: deduplicated.length + 1,
      });
    } else if (!norm) {
      deduplicated.push(t);
    }
  });

  return { data: deduplicated, rawTotal: rawTasks.length, error };
};

export const cleanDuplicateRoadmapTasks = async (userId: string, adminId: string) => {
  const { data, error } = await supabase
    .from('roadmaps')
    .select('id, title, step_order')
    .eq('user_id', userId)
    .order('step_order', { ascending: true });

  if (error || !data || data.length === 0) return { countRemoved: 0 };

  const seen = new Set<string>();
  const idsToDelete: string[] = [];

  data.forEach((row: { id: string; title: string }) => {
    const norm = (row.title || '').trim().toLowerCase();
    if (norm && seen.has(norm)) {
      idsToDelete.push(row.id);
    } else if (norm) {
      seen.add(norm);
    }
  });

  if (idsToDelete.length > 0) {
    for (const id of idsToDelete) {
      await supabase.from('roadmaps').delete().eq('id', id);
    }
    await writeAuditLog(adminId, 'clean_duplicate_roadmap_steps', 'roadmaps', userId, {
      removed_count: idsToDelete.length,
    });
  }

  return { countRemoved: idsToDelete.length };
};

export const broadcastNotificationToAllUsers = async (
  title: string,
  descText: string,
  adminId: string,
  type = 'community_announcement'
) => {
  try {
    const { data: users } = await supabase.from('profiles').select('id');
    if (users && users.length > 0) {
      const rows = users.map((u: { id: string }) => ({
        user_id: u.id,
        title,
        desc_text: descText,
        type,
        read: false,
        created_at: new Date().toISOString(),
      }));

      // Insert in chunks of 40
      for (let i = 0; i < rows.length; i += 40) {
        await supabase.from('notifications').insert(rows.slice(i, i + 40));
      }

      await writeAuditLog(adminId, 'broadcast_notification', 'notifications', 'all_users', {
        title,
        recipient_count: users.length,
      });
    }
  } catch (err) {
    console.warn('Broadcast notification error:', err);
  }
};

export const injectUserRoadmapTask = async (
  userId: string,
  task: Omit<RoadmapTask, 'id' | 'user_id'>,
  adminId: string
) => {
  const clientKey = task.client_key || `admin-step-${Date.now()}`;
  const payload = {
    user_id: userId,
    client_key: clientKey,
    title: task.title,
    category: task.category || 'General',
    status: task.status || 'Pending',
    desc_text: task.desc || task.desc_text || '',
    step_order: task.step_order || 1,
    sub_steps: task.sub_steps || [],
    agency: task.agency || '',
    legal_basis: task.legal_basis || '',
    estimated_time: task.estimated_time || '',
    estimated_cost: task.estimated_cost || '',
    required_docs: task.required_docs || [],
  };

  const { data, error } = await supabase
    .from('roadmaps')
    .insert(payload)
    .select()
    .single();

  if (!error && data) {
    await writeAuditLog(adminId, 'inject_user_roadmap_task', 'roadmaps', data.id, {
      user_id: userId,
      title: task.title,
    });

    // Also send user notification
    await sendUserNotification(
      userId,
      'New Roadmap Step Added',
      `Admin assigned a new step to your business roadmap: "${task.title}".`,
      'roadmap_update'
    );
  }
  return { data, error };
};

export const assignCuratedRoadmapToUser = async (
  userId: string,
  tasks: RoadmapTask[],
  roadmapTitle: string,
  adminId: string
) => {
  // First, retrieve current max step or replace
  const rows = tasks.map((t, idx) => ({
    user_id: userId,
    client_key: `curated-${Date.now()}-${idx + 1}`,
    title: t.title,
    category: t.category || 'Milestone',
    status: t.status || 'Pending',
    desc_text: t.desc || t.desc_text || '',
    step_order: idx + 1,
    sub_steps: t.sub_steps || [],
    agency: t.agency || '',
    legal_basis: t.legal_basis || '',
    estimated_time: t.estimated_time || '',
    estimated_cost: t.estimated_cost || '',
    required_docs: t.required_docs || [],
  }));

  const { data, error } = await supabase.from('roadmaps').insert(rows).select();

  if (!error) {
    await writeAuditLog(adminId, 'assign_roadmap_template', 'roadmaps', userId, {
      user_id: userId,
      template_name: roadmapTitle,
      step_count: tasks.length,
    });

    await sendUserNotification(
      userId,
      'Roadmap Updated by Admin',
      `An administrator has assigned the "${roadmapTitle}" plan to your active roadmap.`,
      'roadmap_assigned'
    );
  }
  return { data, error };
};

export const updateUserRoadmapTask = async (
  taskId: string,
  updates: Partial<RoadmapTask>,
  adminId: string
) => {
  const payload: any = { ...updates };
  if (updates.desc) {
    payload.desc_text = updates.desc;
  }

  const { data, error } = await supabase
    .from('roadmaps')
    .update(payload)
    .eq('id', taskId)
    .select()
    .single();

  if (!error && data) {
    await writeAuditLog(adminId, 'update_user_roadmap_task', 'roadmaps', taskId, updates);
  }
  return { data, error };
};

export const deleteUserRoadmapTask = async (
  taskId: string,
  userId: string,
  adminId: string
) => {
  const { error } = await supabase.from('roadmaps').delete().eq('id', taskId);
  if (!error) {
    await writeAuditLog(adminId, 'delete_user_roadmap_task', 'roadmaps', taskId, { user_id: userId });
  }
  return { error };
};

export const sendUserNotification = async (
  userId: string,
  title: string,
  descText: string,
  type = 'admin_notice'
) => {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      title,
      desc_text: descText,
      type,
      read: false,
      created_at: new Date().toISOString(),
    });
    if (error) console.warn('Send notification error:', error.message);
  } catch (e) {
    console.warn('Send notification exception:', e);
  }
};

// ==========================================
// 6. Community Forums / Kapihan Discussions
// ==========================================

export const fetchForumPosts = async () => {
  const { data, error } = await supabase
    .from('community_forum_posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    // If table not created yet or error, return empty gracefully
    console.warn('Forum posts fetch note:', error.message);
    return { data: [] as ForumPost[], error };
  }
  return { data: (data as ForumPost[]) || [], error: null };
};

export const createForumPost = async (
  post: {
    author_id: string;
    author_name: string;
    business_type?: string;
    topic: string;
    title: string;
    content: string;
    ai_advice?: string;
    statutory_ref?: string;
    is_pinned?: boolean;
  },
  adminId: string
) => {
  const payload = {
    author_id: post.author_id,
    author_name: post.author_name,
    business_type: post.business_type || 'MSME Founder',
    topic: post.topic,
    title: post.title,
    content: post.content,
    ai_advice: post.ai_advice || '',
    statutory_ref: post.statutory_ref || '',
    is_pinned: post.is_pinned || false,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('community_forum_posts')
    .insert(payload)
    .select()
    .single();

  if (!error && data) {
    await writeAuditLog(adminId, 'create_forum_post', 'community_forum_posts', data.id, {
      title: post.title,
      topic: post.topic,
    });
  }
  return { data: data as ForumPost | null, error };
};

export const deleteForumPost = async (postId: string, adminId: string) => {
  const { error } = await supabase.from('community_forum_posts').delete().eq('id', postId);
  if (!error) {
    await writeAuditLog(adminId, 'delete_forum_post', 'community_forum_posts', postId, {});
  }
  return { error };
};

export const fetchForumReplies = async (postId: string) => {
  const { data, error } = await supabase
    .from('community_forum_replies')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) {
    return { data: [] as ForumReply[], error };
  }
  return { data: (data as ForumReply[]) || [], error: null };
};

export const createForumReply = async (
  postId: string,
  replyText: string,
  adminId: string,
  adminName = 'LikhAI Verified Admin'
) => {
  const payload = {
    post_id: postId,
    author_id: adminId,
    author_name: adminName,
    author_role: 'admin',
    reply_text: replyText,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('community_forum_replies')
    .insert(payload)
    .select()
    .single();

  if (!error && data) {
    await writeAuditLog(adminId, 'post_forum_reply', 'community_forum_replies', data.id, {
      post_id: postId,
    });
  }
  return { data: data as ForumReply | null, error };
};

export const deleteForumReply = async (replyId: string, adminId: string) => {
  const { error } = await supabase.from('community_forum_replies').delete().eq('id', replyId);
  if (!error) {
    await writeAuditLog(adminId, 'delete_forum_reply', 'community_forum_replies', replyId, {});
  }
  return { error };
};

// ==========================================
// 7. Admin Authorization Check
// ==========================================

export const checkIsAdmin = async (uid: string): Promise<boolean> => {
  const { data, error } = await supabase.from('profiles').select('is_admin').eq('id', uid).maybeSingle();
  if (error || !data) return false;
  return Boolean((data as { is_admin: boolean }).is_admin);
};

