import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { decode as decodeBase64 } from 'base64-arraybuffer';
import { auth as firebaseAuth } from './firebase';
import { MarkupType, PurchaseMode } from './calculator';
import { BusinessProfile, TaskBlueprint, getBusinessProfile } from './businessProfiles';

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
      // This app authenticates users through Firebase, not Supabase's own
      // Auth. Supabase's "Third-Party Auth" support lets it verify a
      // Firebase ID token directly (once Firebase is added as a trusted
      // provider in the Supabase Dashboard) and populate auth.jwt()/RLS
      // context from it — so every request here carries the current
      // Firebase user's ID token, refreshed automatically by the Firebase
      // SDK, letting RLS policies enforce real per-user data ownership
      // instead of relying only on client-side query filters.
      accessToken: async () => {
        // Firebase restores a persisted login asynchronously (from
        // IndexedDB/localStorage), so immediately after an app start or hot
        // reload, `auth.currentUser` can briefly read as null even for an
        // already-logged-in user — before Firebase has finished checking.
        // Without this wait, a request that races that window goes out with
        // no token, and under RLS that reads back as "no profile found,"
        // which previously got misread elsewhere as "this is a new user"
        // (see AuthContext.tsx) — resetting onboarding and briefly wiping
        // profile data that was never actually missing.
        await firebaseAuth.authStateReady();
        const user = firebaseAuth.currentUser;
        if (!user) return null;
        try {
          return await user.getIdToken();
        } catch {
          return null;
        }
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
  avatar_color?: string;
  /** Public URL of the user's profile photo; null falls back to initials. */
  avatar_url?: string | null;
  push_notifications_enabled?: boolean;
  email_notifications_enabled?: boolean;
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
  // Snapshotted at publish time: profiles are owner-only under RLS, so a
  // viewer cannot read the author's row to look this up.
  author_avatar_url?: string | null;
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
  image_url?: string;
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

// In-memory cache & request deduplication map for user profile fetching
const profileCache = new Map<string, { data: any; error: any; timestamp: number }>();
const pendingProfileFetches = new Map<string, Promise<{ data: any; error: any }>>();

export const clearProfileCache = (userId?: string) => {
  if (userId) {
    profileCache.delete(userId);
  } else {
    profileCache.clear();
  }
};

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
    if (profile.avatar_color !== undefined) payload.avatar_color = profile.avatar_color;
    if (profile.avatar_url !== undefined) payload.avatar_url = profile.avatar_url;
    if (profile.push_notifications_enabled !== undefined) payload.push_notifications_enabled = profile.push_notifications_enabled;
    if (profile.email_notifications_enabled !== undefined) payload.email_notifications_enabled = profile.email_notifications_enabled;

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' });

    if (error) console.warn('Supabase profile sync warning:', error);
    clearProfileCache(profile.id);
    return { data, error };
  } catch (err) {
    console.warn('Supabase sync exception:', err);
    return { data: null, error: err };
  }
};

// 2. Fetch User Profile (Deduplicated with maybeSingle)
export const fetchUserProfile = async (userId: string) => {
  if (!userId) return { data: null, error: 'No user ID' };

  // Check 3-second cache
  const cached = profileCache.get(userId);
  if (cached && Date.now() - cached.timestamp < 3000) {
    return { data: cached.data, error: cached.error };
  }

  // Deduplicate in-flight requests for the exact same userId
  if (pendingProfileFetches.has(userId)) {
    return pendingProfileFetches.get(userId)!;
  }

  const fetchPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      profileCache.set(userId, { data, error, timestamp: Date.now() });
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    } finally {
      pendingProfileFetches.delete(userId);
    }
  })();

  pendingProfileFetches.set(userId, fetchPromise);
  return fetchPromise;
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

/** Binds a business profile's task blueprint to a user and a step number. */
const blueprintToTask = (
  blueprint: TaskBlueprint,
  userId: string,
  id: string,
  stepOrder: number
): RoadmapTask => ({
  id,
  user_id: userId,
  title: blueprint.title,
  category: blueprint.category,
  status: 'Pending',
  desc: blueprint.desc,
  step_order: stepOrder,
  agency: blueprint.agency,
  legal_basis: blueprint.legal_basis,
  estimated_time: blueprint.estimated_time,
  estimated_cost: blueprint.estimated_cost,
  required_docs: blueprint.required_docs,
  sub_steps: blueprint.sub_steps.map((title, index) => ({
    id: `${id}-${index + 1}`,
    title,
    completed: false,
  })),
});

/**
 * Steps 1-5 are the universal Philippine registration path — identical whether
 * you sell lugaw or groom dogs. Steps 6-7 are where businesses genuinely
 * differ, so they come from the business profile: a service business gets
 * "Price Your Services & Prepare Your Tools" where a store gets "Source
 * Wholesale Stock". Pass `profile` explicitly during onboarding (it may be
 * AI-generated for a custom type); other callers let it resolve from
 * businessType.
 */
export const getDefaultPhilippineRoadmapTasks = (
  userId: string,
  businessType?: string,
  location?: string,
  profile?: BusinessProfile
): RoadmapTask[] => [
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
  // Steps 6-7 come from the business profile, so a service business is never
  // told to canvass wholesalers or hang price tags on merchandise it does not
  // have. `profile` wins when onboarding passes an AI-generated one.
  blueprintToTask((profile || getBusinessProfile(businessType)).operationsTask, userId, '6', 6),
  blueprintToTask((profile || getBusinessProfile(businessType)).launchTask, userId, '7', 7),
];

// ----------------------------------------------------
// Onboarding-driven Roadmap Tailoring
// ----------------------------------------------------
// The full onboarding wizard answers, as saved in `profiles.onboarding_draft`.
export interface OnboardingAnswers {
  selectedCategory?: string;
  customCategory?: string;
  businessNameInput?: string;
  selectedStage?: string;
  selectedRegion?: { name: string } | null;
  selectedProvince?: { name: string } | null;
  selectedCity?: { name: string } | null;
  selectedBarangay?: { name: string } | null;
  selectedCustomers?: string[];
  differentiator?: string;
  researchStage?: string;
  startingBudget?: string;
  fundingSources?: string[];
  cashRunway?: string;
  registrationType?: string;
  obtainedPermits?: string[];
  insuranceStatus?: string;
  selectedRisks?: string[];
  /** Answers to the business-type-specific questions on step 4, keyed by question id. */
  extraAnswers?: { [questionId: string]: string };
  /** True when the profile driving these questions was generated by Khora AI. */
  aiTailored?: boolean;
}

// Legacy risk list, kept so roadmaps generated before business profiles
// existed still resolve their contingency copy. New risks come from the
// user's business profile — see services/businessProfiles.ts.
export const RISK_CONTINGENCIES: { [risk: string]: string } = {
  'Slow sales': 'Launch a 3-day opening promotion and partner with neighboring stores for cross-referrals.',
  'Strong competition': 'Highlight your specific business advantage and offer GCash cash-in convenience or bundle items.',
  'Rising supply prices': 'Source ingredients directly from Divisoria or local wet market wholesalers and lock in bulk rates.',
  Spoilage: 'Keep daily inventory lean during week 1 and establish a strict first-in, first-out stock system.',
  'Running out of cash': 'Keep a portion of your starting budget untouched as emergency cash and review weekly expenses.',
  'Typhoons or outages': 'Prepare solar/rechargeable lights and waterproof storage for raw inventory.',
  'Permit problems': 'Complete your Barangay Micro-Business Permit first before applying for Mayor permit clearance.',
  'Not having enough time': 'Set fixed 2-hour daily operational slots and delegate basic tasks to family or staff.',
};

// Permit answer labels (from onboarding Step 6) mapped to the matching
// default roadmap task id, so a permit the user says they already have gets
// marked Completed instead of asking them to redo it.
const PERMIT_TASK_MAP: { [permitLabel: string]: string } = {
  'Barangay clearance': '1',
  DTI: '2',
  "Mayor's / Business Permit": '3',
  BIR: '4',
};

/**
 * Turns the generic Philippine launch checklist into a plan tailored to this
 * user's actual onboarding answers: skips permits they already hold, swaps
 * the registration step for SEC when they're incorporating, and appends a
 * risk-contingency task built from the specific risks they flagged.
 */
export const tailorRoadmapTasks = (
  tasks: RoadmapTask[],
  answers: OnboardingAnswers,
  // Contingency copy for the risks this user was actually shown, which vary by
  // business type. Falls back to the legacy list for older callers.
  riskContingencies: { [risk: string]: string } = RISK_CONTINGENCIES
): RoadmapTask[] => {
  let tailored = tasks.map((task) => {
    if (!task.id) return task;

    const matchedPermit = Object.entries(PERMIT_TASK_MAP).find(
      ([label, taskId]) => taskId === task.id && answers.obtainedPermits?.includes(label)
    );
    if (matchedPermit) {
      return {
        ...task,
        status: 'Completed' as const,
        sub_steps: (task.sub_steps || []).map((s) => ({ ...s, completed: true })),
      };
    }

    // Corporations register with the SEC instead of DTI's sole-proprietor flow.
    if (task.id === '2' && answers.registrationType === 'corporation') {
      return {
        ...task,
        title: 'SEC Corporate Registration',
        desc: 'National legal registration for a corporation, replacing DTI sole-proprietor registration.',
        agency: 'Securities and Exchange Commission (SEC)',
        legal_basis: 'Revised Corporation Code of the Philippines (RA 11232)',
        estimated_time: '3 - 10 Business Days',
        estimated_cost: '₱2,000 - ₱10,000 (varies by capital)',
        required_docs: ['Articles of Incorporation', 'By-Laws', "Treasurer's Affidavit", '2 Valid IDs of incorporators'],
        sub_steps: [
          { id: '2-1', title: 'Reserve company name via SEC Company Registration System (SEC CRS)', completed: false },
          { id: '2-2', title: 'Prepare Articles of Incorporation & By-Laws', completed: false },
          { id: '2-3', title: 'Submit documents and pay filing fees online via SEC CRS', completed: false },
          { id: '2-4', title: 'Download Certificate of Incorporation upon approval', completed: false },
        ],
      };
    }

    return task;
  });

  if (answers.selectedRisks && answers.selectedRisks.length > 0) {
    const riskLines = answers.selectedRisks
      .map((risk) => `• ${risk}: ${riskContingencies[risk] || 'Review this risk with Khora AI for a tailored plan.'}`)
      .join('\n');

    tailored = [
      ...tailored,
      {
        user_id: tasks[0]?.user_id || '',
        title: 'Risk Contingency & Backup Plan',
        category: 'Planning',
        status: 'Pending',
        desc: `Based on the risks you flagged during onboarding, here is your starting contingency plan:\n${riskLines}`,
        step_order: (tasks.length || 0) + 1,
        agency: 'Self-managed',
        legal_basis: 'Personal business continuity planning (not a government requirement)',
        estimated_time: 'Ongoing',
        estimated_cost: 'Varies',
        required_docs: [],
        sub_steps: answers.selectedRisks.map((risk, idx) => ({
          id: `risk-${idx + 1}`,
          title: `Prepare for: ${risk}`,
          desc: riskContingencies[risk],
          completed: false,
        })),
      },
    ];
  }

  return tailored;
};

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

// ----------------------------------------------------
// User's Personal Template Library
// ----------------------------------------------------
// A user's saved templates, distinct from their single active roadmap
// (public.roadmaps). Built via the template builder so a user can create
// more than one and later choose which one to share to Community — sharing
// no longer just publishes whatever the active roadmap happens to be.
export interface UserTemplate {
  id: string;
  user_id: string;
  name: string;
  business_type: string;
  summary: string;
  image_url: string;
  template_data: RoadmapTask[];
  created_at?: string;
  updated_at?: string;
}

export const fetchUserTemplates = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_templates')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data: data as UserTemplate[] | null, error };
};

export const createUserTemplate = async (
  template: Omit<UserTemplate, 'id' | 'created_at' | 'updated_at'>
) => {
  const { data, error } = await supabase
    .from('user_templates')
    .insert({ ...template, updated_at: new Date().toISOString() })
    .select()
    .single();
  return { data: data as UserTemplate | null, error };
};

export const deleteUserTemplate = async (templateId: string, userId: string) => {
  const { error } = await supabase
    .from('user_templates')
    .delete()
    .eq('id', templateId)
    .eq('user_id', userId);
  return { error };
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

    if (category && category !== 'All' && category !== 'Nearby') {
      query = query.eq('category', category);
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim();
      query = query.or(`name.ilike.%${q}%,category.ilike.%${q}%,location.ilike.%${q}%`);
    }

    let { data, error } = await query;

    // Fallback: If strict location/query produced no results, fetch all suppliers
    if ((!data || data.length === 0) && locationFilter) {
      let fallbackQuery = supabase.from('suppliers').select('*');
      if (category && category !== 'All' && category !== 'Nearby') {
        fallbackQuery = fallbackQuery.eq('category', category);
      }
      const res = await fallbackQuery;
      if (res.data && res.data.length > 0) {
        data = res.data;
        error = null;
      }
    }

    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
};

// ----------------------------------------------------
// 8. Smart Calculator — per-product pricing/costing
// ----------------------------------------------------
export interface Product {
  id: string;
  user_id: string;

  name: string;
  category: string; // inferred by Khora AI, not typed by the user
  image_url?: string | null;

  // Which business roadmap this product's price book belongs to: 'active' for
  // the user's live roadmap, otherwise a user_templates.id. The label is
  // snapshotted so the list still reads correctly if that template is later
  // renamed or deleted.
  business_key?: string | null;
  business_label?: string | null;

  purchase_mode: PurchaseMode;
  manual_cost_per_piece?: number | null;
  pack_total_price?: number | null;
  pack_item_count?: number | null;
  bulk_quantity?: number | null; // total bought, e.g. 100 kg
  bulk_total_price?: number | null;
  bulk_portion_size?: number | null; // one sellable portion, in kilos or liters
  bulk_portion_unit?: string | null; // how it was typed: 'kg' | 'g' | 'L' | 'ml'
  bulk_pieces_yielded?: number | null; // derived: floor(quantity / portion)
  batch_pieces?: number | null;

  dagdag_gastos_per_piece: number;

  // Derived from the final selling price rather than entered by hand —
  // kept so the table still reads sensibly outside the app.
  markup_type: MarkupType;
  markup_value: number;

  estimated_daily_units_sold?: number | null;

  // What Khora AI recommended, kept even after a manual nudge so the
  // original call is never lost.
  ai_suggested_price?: number | null;
  ai_suggested_markup_percent?: number | null;
  ai_reasoning?: string | null;
  ai_confidence?: string | null;
  ai_tips?: string[] | null;
  ai_source?: string | null;
  price_source: 'ai' | 'manual';

  // Computed results, snapshotted at save time — see computeCost /
  // computeAtPrice in services/calculator.ts for how these are derived.
  puhunan: number;
  total_cost_per_piece: number;
  exact_selling_price: number;
  selling_price: number;
  tubo_per_piece: number;
  margin_percent: number;
  markup_percent_effective: number;
  batch_total_investment: number;
  batch_total_profit_potential: number;
  breakeven_units?: number | null;
  breakeven_days?: number | null;
  remaining_pieces_as_profit?: number | null;

  created_at?: string;
  updated_at?: string;
}

export const fetchUserProducts = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data: data as Product[] | null, error };
  } catch (err) {
    return { data: null, error: err };
  }
};

/**
 * The distinct category names this user's products already use. Fed back into
 * the pricing form so a new product joins an existing category instead of
 * creating a near-duplicate of it.
 */
export const fetchUserProductCategories = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .eq('user_id', userId);

    const categories = Array.from(
      new Set(((data as { category?: string }[] | null) || []).map((row) => (row.category || '').trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    return { data: categories, error };
  } catch (err) {
    return { data: [] as string[], error: err };
  }
};

export const fetchProductById = async (id: string, userId: string) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();
    return { data: data as Product | null, error };
  } catch (err) {
    return { data: null, error: err };
  }
};

export const createProduct = async (
  product: Omit<Product, 'id' | 'created_at' | 'updated_at'>
) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert({ ...product, updated_at: new Date().toISOString() })
      .select()
      .single();
    return { data: data as Product | null, error };
  } catch (err) {
    return { data: null, error: err };
  }
};

export const updateProduct = async (
  id: string,
  userId: string,
  updates: Partial<Omit<Product, 'id' | 'user_id' | 'created_at'>>
) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    return { data: data as Product | null, error };
  } catch (err) {
    return { data: null, error: err };
  }
};

export const deleteProduct = async (id: string, userId: string) => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    return { error };
  } catch (err) {
    return { error: err };
  }
};

/**
 * Uploads a profile photo to the public "avatars" bucket, under a path
 * prefixed with the owner's Firebase UID — matching the ownership check in
 * week15_profile_photos.sql. The bucket is public-read because community
 * posts must render the author's photo for viewers who cannot read the
 * author's profile row.
 */
export const uploadAvatarImage = async (
  userId: string,
  base64Data: string,
  fileExt: 'jpg' | 'png' = 'jpg'
): Promise<{ url: string | null; error: any }> => {
  try {
    const path = `${userId}/avatar-${Date.now()}.${fileExt}`;
    const contentType = fileExt === 'png' ? 'image/png' : 'image/jpeg';

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, decodeBase64(base64Data), { contentType, upsert: false });

    if (uploadError) {
      console.warn('Avatar upload failed:', uploadError);
      return { url: null, error: uploadError };
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (err) {
    console.warn('Avatar upload exception:', err);
    return { url: null, error: err };
  }
};

/**
 * Uploads a product photo (as base64, straight from expo-image-picker's
 * `base64: true` result) to the "product-images" storage bucket, under a
 * path prefixed with the owner's Firebase UID — matching the ownership
 * check in week12_smart_calculator.sql's storage policies. Returns a public
 * URL, since the bucket itself is public (same pattern as every other image
 * already used in this app).
 */
export const uploadProductImage = async (
  userId: string,
  base64Data: string,
  fileExt: 'jpg' | 'png' = 'jpg'
): Promise<{ url: string | null; error: any }> => {
  try {
    const path = `${userId}/product-${Date.now()}.${fileExt}`;
    const contentType = fileExt === 'png' ? 'image/png' : 'image/jpeg';

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(path, decodeBase64(base64Data), { contentType, upsert: false });

    if (uploadError) {
      console.warn('Product image upload failed:', uploadError);
      return { url: null, error: uploadError };
    }

    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (err) {
    console.warn('Product image upload exception:', err);
    return { url: null, error: err };
  }
};
