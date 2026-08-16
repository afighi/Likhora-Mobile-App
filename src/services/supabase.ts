import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cljzmisdceuxuzbwmnrz.supabase.co';

// Standard Supabase JWT Anon Key for cljzmisdceuxuzbwmnrz
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsanptaXNkY2V1eHV6YndtbnJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NTk0NjksImV4cCI6MjEwMjAzNTQ2OX0.xH-qOsLoGtN1DUj1NYi7UAYpW7XNP8qp9A8o3Ucmsr8';

// Singleton instance to prevent "Multiple GoTrueClient instances detected" warning
let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return supabaseInstance;
};

export const supabase = getSupabaseClient();

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
  onboarding_step?: number;
  onboarding_draft?: string;
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
  user_id: string;
  title: string;
  category: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  desc?: string;
  step_order?: number;
  sub_steps?: SubStep[];
  estimated_time?: string;
  estimated_cost?: string;
  agency?: string;
  legal_basis?: string;
  required_docs?: string[];
  tips?: string[];
}

export interface CommunityPost {
  id: string;
  author_id: string;
  author_name: string;
  business_name: string;
  business_type: string;
  location: string;
  summary: string;
  image_url: string;
  template_data: RoadmapTask[];
  created_at: string;
}

export interface UserNotification {
  id: string;
  user_id: string;
  title: string;
  desc_text: string;
  type: string;
  read: boolean;
  created_at: string;
}

export interface SupplierItem {
  id: string;
  name: string;
  category: string;
  rating: number | string;
  distance: string;
  location: string;
  tags: string[];
  price_level: string;
  price_range?: string;
  phone: string;
  lat?: number;
  lng?: number;
  created_at?: string;
}

// Keep new roadmap rows compatible with databases that require the client to
// provide an ID, while the SQL migration below also provides a database default.
export const createRoadmapUuid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
};

const isUuid = (value?: string) => Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));

// 1. Sync & Upsert User Profile
export const syncUserProfile = async (profile: UserProfile) => {
  try {
    const payload: any = {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      business_name: profile.business_name || '',
      business_type: profile.business_type || '',
      budget: profile.budget || '',
      experience_level: profile.experience_level || '',
      location: profile.location || '',
      launch_date: profile.launch_date || '',
      onboarded: profile.onboarded ?? false,
      updated_at: new Date().toISOString()
    };

    if (profile.onboarding_step !== undefined) payload.onboarding_step = profile.onboarding_step;
    if (profile.onboarding_draft !== undefined) payload.onboarding_draft = profile.onboarding_draft;

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' });

    if (error) console.warn('Supabase profile sync warning:', error);
    return { data, error };
  } catch (err) {
    console.warn('Supabase sync exception:', err);
    return { data: null, error: err };
  }
};

// 2. Fetch User Profile
export const fetchUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
};

// 3. Save Onboarding Progress Step
export const saveOnboardingStepProgress = async (
  userId: string,
  stepNumber: number,
  draftData: unknown,
  profile?: Pick<UserProfile, 'email' | 'full_name'>,
) => {
  try {
    const progress = {
      onboarding_step: stepNumber,
      onboarding_draft: JSON.stringify(draftData),
      updated_at: new Date().toISOString(),
    };

    // Updating first avoids attempting to insert an incomplete profile row.
    const { data, error } = await supabase
      .from('profiles')
      .update(progress)
      .eq('id', userId)
      .select('id')
      .maybeSingle();

    if (error || data) return { data, error };

    // A newly authenticated user may not have a profile yet. Create a complete
    // row in that case, rather than upserting only onboarding fields.
    return await syncUserProfile({
      id: userId,
      email: profile?.email || '',
      full_name: profile?.full_name || 'Entrepreneur',
      onboarded: false,
      onboarding_step: stepNumber,
      onboarding_draft: progress.onboarding_draft,
    });
  } catch (err) {
    return { data: null, error: err };
  }
};

// 4. Reset User Profile / Logout
export const clearUserProfileCache = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('likhora_user_profile');
  }
};

// 5. Save & Fetch User Roadmap Tasks
export const getCachedRoadmapTasks = (userId?: string): RoadmapTask[] | null => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const key = `likhora_roadmap_${userId || 'guest'}`;
    const raw = window.localStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
  }
  return null;
};

export const setCachedRoadmapTasks = (tasks: RoadmapTask[], userId?: string) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const key = `likhora_roadmap_${userId || 'guest'}`;
    window.localStorage.setItem(key, JSON.stringify(tasks));
  }
};

export const getDefaultPhilippineRoadmapTasks = (userId: string, businessType?: string, location?: string): RoadmapTask[] => [
  {
    id: '1',
    user_id: userId,
    title: `Barangay Micro-Business Clearance in ${location || 'your locality'}`,
    category: 'Permits',
    status: 'Pending',
    desc: 'Mandatory local clearance required before commencing commercial operations.',
    step_order: 1,
    agency: 'Local Barangay Hall BPLO Desk',
    legal_basis: 'RA 9178 (BMBE Act) & RA 7160 Local Government Code',
    estimated_time: '1 - 2 Business Days',
    estimated_cost: '₱200 - ₱500',
    required_docs: ['2 Valid Government IDs', 'Community Tax Certificate (Cedula)', 'Lease Contract / Proof of Address'],
    sub_steps: [
      { id: '1-1', title: 'Request Barangay Business Permit Application Form at Barangay BPLO Desk', completed: false },
      { id: '1-2', title: 'Present 2 Valid Government IDs, Cedula & Lease Contract / Homeowner Consent', completed: false },
      { id: '1-3', title: 'Pay Barangay Clearance Fee (₱200 - ₱500 based on LGU Ordinance)', completed: false },
      { id: '1-4', title: 'Collect signed Barangay Micro-Business Clearance Certificate with official dry seal', completed: false },
    ],
  },
  {
    id: '2',
    user_id: userId,
    title: 'DTI Business Name Registration Certificate',
    category: 'Permits',
    status: 'Pending',
    desc: 'National legal registration securing your business name nationwide.',
    step_order: 2,
    agency: 'Department of Trade and Industry (DTI BNRS)',
    legal_basis: 'Act No. 3883 (Philippine Business Name Law)',
    estimated_time: '30 - 60 Minutes (Online)',
    estimated_cost: '₱530 (City/Municipal Scope + Doc Stamp)',
    required_docs: ['1 Valid Government ID', 'DTI BNRS Online Application Form'],
    sub_steps: [
      { id: '2-1', title: 'Access official DTI BNRS portal at bnrs.dti.gov.ph', completed: false },
      { id: '2-2', title: 'Input proposed business name (Dominant Name + Business Descriptor)', completed: false },
      { id: '2-3', title: 'Select territorial scope (City/Municipal) & pay ₱530 via GCash/Maya', completed: false },
      { id: '2-4', title: 'Download & print official DTI Certificate of Business Name Registration (Valid 5 Years)', completed: false },
    ],
  },
  {
    id: '3',
    user_id: userId,
    title: 'Mayor Business License & BFP Fire Safety Permit',
    category: 'Permits',
    status: 'Pending',
    desc: 'Official City Mayor permit authorizing business operations in your municipality.',
    step_order: 3,
    agency: 'City / Municipal Hall BPLO & Bureau of Fire Protection',
    legal_basis: 'Local Government Code of 1991 (RA 7160 Sec 143/151)',
    estimated_time: '3 - 7 Business Days',
    estimated_cost: '₱1,500 - ₱4,000',
    required_docs: ['DTI Certificate', 'Barangay Clearance', 'BFP Fire Safety Inspection Cert', 'Zoning Clearance'],
    sub_steps: [
      { id: '3-1', title: 'Submit DTI Certificate & Barangay Clearance to City BPLO window', completed: false },
      { id: '3-2', title: 'Undergo BFP Fire Safety Inspection & City Health Sanitary Inspection', completed: false },
      { id: '3-3', title: 'Pay Mayor Permit Fee, Garbage Fee & Sanitary License at City Treasurer', completed: false },
      { id: '3-4', title: 'Claim official Mayor Business Permit, Business Plate & Sanitary Inspection Sticker', completed: false },
    ],
  },
  {
    id: '4',
    user_id: userId,
    title: 'BIR Tax Registration & Official Receipts (Form 1901)',
    category: 'Permits',
    status: 'Pending',
    desc: 'Mandatory tax authority registration for issuance of legal Sales Receipts.',
    step_order: 4,
    agency: 'Bureau of Internal Revenue (BIR Revenue District Office)',
    legal_basis: 'National Internal Revenue Code (NIRC Sec 236) & RR 11-2018',
    estimated_time: '3 - 5 Business Days',
    estimated_cost: '₱530 ARF + ~₱1,000 Receipt Printing',
    required_docs: ['BIR Form 1901', 'DTI Certificate', 'Mayor Permit / Barangay Clearance', '2 Valid IDs'],
    sub_steps: [
      { id: '4-1', title: 'File BIR Form 1901 at your assigned BIR Revenue District Office (RDO)', completed: false },
      { id: '4-2', title: 'Pay ₱500 Annual Registration Fee (ARF) + ₱30 Loose Documentary Stamp', completed: false },
      { id: '4-3', title: 'Register Official Books of Accounts (General Journal & Ledger)', completed: false },
      { id: '4-4', title: 'Apply for BIR Authority to Print (ATP) & receive BIR Form 2303 Certificate', completed: false },
    ],
  },
  {
    id: '5',
    user_id: userId,
    title: 'SSS, PhilHealth & Pag-IBIG Mandatory Registration',
    category: 'Finance',
    status: 'Pending',
    desc: 'Statutory social security & healthcare registration for business owners and employees.',
    step_order: 5,
    agency: 'SSS, PhilHealth & Pag-IBIG Fund Offices',
    legal_basis: 'RA 11199 (SS Act), RA 11223 (UHC Act) & RA 9679',
    estimated_time: '1 - 2 Days',
    estimated_cost: 'Free Registration',
    required_docs: ['Form R-1 (SSS)', 'PhilHealth ER1 Form', 'Pag-IBIG Employer Form', 'DTI Cert'],
    sub_steps: [
      { id: '5-1', title: 'Submit SSS Form R-1 & R-1A Employer Registration Form', completed: false },
      { id: '5-2', title: 'Submit PhilHealth ER1 Employer Data Record Form', completed: false },
      { id: '5-3', title: 'Submit Pag-IBIG Employer Registration Form', completed: false },
      { id: '5-4', title: 'Receive Employer ID Numbers for statutory monthly contribution remittance', completed: false },
    ],
  },
  {
    id: '6',
    user_id: userId,
    title: `Source Wholesale ${businessType || 'Goods'} & Product Costing`,
    category: 'Supplies',
    status: 'Pending',
    desc: 'Establish direct supplier supply chain and compute profitable 35%+ markups.',
    step_order: 6,
    agency: 'Private Suppliers & Wholesalers',
    legal_basis: 'RA 9178 BMBE Financial Compliance & Cost Accounting',
    estimated_time: '2 - 3 Days',
    estimated_cost: 'Operating Budget',
    required_docs: ['Supplier Contacts List', 'Recipe / Costing Sheet', 'GCash Merchant QR'],
    sub_steps: [
      { id: '6-1', title: 'Research top 3 wholesale suppliers in Divisoria, Balintawak or local market', completed: false },
      { id: '6-2', title: 'Itemize raw material & packaging costs per single unit', completed: false },
      { id: '6-3', title: 'Add 35% - 50% profit margin markup to cover rent, utilities & net profit', completed: false },
      { id: '6-4', title: 'Setup dedicated business e-wallet / GCash Merchant payment account', completed: false },
    ],
  },
  {
    id: '7',
    user_id: userId,
    title: 'Storefront Display Signage & 3-Day Soft Opening Promo',
    category: 'Launch',
    status: 'Pending',
    desc: 'Compliant storefront launch with price tags and neighborhood introductory offer.',
    step_order: 7,
    agency: 'DTI Fair Trade Bureau & Local Community',
    legal_basis: 'RA 7394 Consumer Act of the Philippines (Price Tag Law)',
    estimated_time: '2 Days',
    estimated_cost: '₱1,000 - ₱2,500',
    required_docs: ['Compliance Posters (BIR 2303, DTI)', 'Price Menu Board', 'Promo Flyers'],
    sub_steps: [
      { id: '7-1', title: 'Display required compliance permits prominently (BIR 2303, DTI, Sanitary Permit)', completed: false },
      { id: '7-2', title: 'Attach clear price tags / menu board on all products (RA 7394 Price Tag Law)', completed: false },
      { id: '7-3', title: 'Set up GCash / Maya QR Code payment standee at customer counter', completed: false },
      { id: '7-4', title: 'Run 3-day Soft Opening discount promo to test sales workflow and speed', completed: false },
    ],
  },
];

export const fetchUserRoadmap = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('roadmaps')
      .select('*')
      .eq('user_id', userId)
      .order('step_order', { ascending: true });

    if (data && data.length > 0) {
      const cached = getCachedRoadmapTasks(userId);
      const merged = data.map((item: any, idx: number) => {
        const cachedItem = cached?.[idx];
        return {
          ...item,
          desc: item.desc_text || item.desc || item.description || cachedItem?.desc || '',
          sub_steps: item.sub_steps || cachedItem?.sub_steps || [],
        };
      });
      setCachedRoadmapTasks(merged, userId);
      return { data: merged, error };
    }
  } catch (err) {
    console.warn('Supabase fetch error, fallback to cache:', err);
  }

  const cached = getCachedRoadmapTasks(userId);
  return { data: cached, error: null };
};

export const saveUserRoadmap = async (tasks: RoadmapTask[]) => {
  const userId = tasks[0]?.user_id || 'guest';
  setCachedRoadmapTasks(tasks, userId);
  try {
    const payload = tasks.map((t, idx) => {
      const item: any = {
        user_id: t.user_id || userId,
        title: t.title,
        category: t.category || 'General',
        status: t.status || 'Pending',
        step_order: t.step_order || idx + 1,
        client_key: t.client_key || t.id || `task-${idx + 1}`,
        desc_text: t.desc || '',
        sub_steps: t.sub_steps || [],
        // Send an explicit UUID for every inserted row. This works whether the
        // database default exists or an older schema requires the ID directly.
        id: isUuid(t.id) ? t.id : createRoadmapUuid(),
      };
      return item;
    });

    const { data, error } = await supabase
      .from('roadmaps')
      .upsert(payload, { onConflict: 'user_id,client_key' })
      .select();

    if (error) {
      console.warn('Supabase roadmap sync note:', error.message);
    }

    return { data, error };
  } catch (err) {
    return { data: tasks, error: err };
  }
};

export const deleteRoadmapTask = async (userId: string, taskId?: string, clientKey?: string) => {
  let query = supabase.from('roadmaps').delete().eq('user_id', userId);
  // client_key remains stable for locally seeded tasks, even before the app has
  // received Supabase's generated UUID for the row.
  query = clientKey ? query.eq('client_key', clientKey) : query.eq('id', taskId || '');
  const { error } = await query;
  return { error };
};

export const replaceUserRoadmap = async (userId: string, tasks: RoadmapTask[]) => {
  const { error: deleteError } = await supabase.from('roadmaps').delete().eq('user_id', userId);
  if (deleteError) return { data: null, error: deleteError };
  return saveUserRoadmap(tasks.map((task, index) => ({
    ...task,
    id: undefined,
    client_key: `community-${Date.now()}-${index}`,
    user_id: userId,
    step_order: index + 1,
  })));
};

export const fetchCommunityPosts = async () => {
  const { data, error } = await supabase
    .from('community_posts')
    .select('*')
    .order('created_at', { ascending: false });
  return { data: data as CommunityPost[] | null, error };
};

export const createCommunityPost = async (post: Omit<CommunityPost, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('community_posts')
    .insert(post)
    .select()
    .single();
  return { data: data as CommunityPost | null, error };
};

export const deleteCommunityPost = async (postId: string, authorId: string) => {
  const { error } = await supabase
    .from('community_posts')
    .delete()
    .eq('id', postId)
    .eq('author_id', authorId);
  return { error };
};

export const fetchFavoriteTemplateIds = async (userId: string) => {
  const { data, error } = await supabase
    .from('community_template_favorites')
    .select('post_id')
    .eq('user_id', userId);
  return { data: data?.map((favorite: { post_id: string }) => favorite.post_id) || [], error };
};

export const toggleFavoriteTemplate = async (userId: string, postId: string, isFavorite: boolean) => {
  if (isFavorite) {
    const { error } = await supabase.from('community_template_favorites').delete().eq('user_id', userId).eq('post_id', postId);
    return { error };
  }
  const { error } = await supabase.from('community_template_favorites').insert({ user_id: userId, post_id: postId });
  return { error };
};

// 6. Fetch & Mark Notifications
export const fetchUserNotifications = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
};

// 7. Fetch Suppliers from Supabase Database Filtered by User Location
export const fetchSuppliersFromSupabase = async (category?: string, searchQuery?: string, locationFilter?: string) => {
  try {
    let query = supabase.from('suppliers').select('*');

    if (locationFilter && locationFilter !== 'Philippines' && locationFilter !== 'your area') {
      query = query.ilike('location', `%${locationFilter}%`);
    }

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    if (searchQuery && searchQuery.trim()) {
      query = query.ilike('name', `%${searchQuery.trim()}%`);
    }

    const { data, error } = await query;
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
};
