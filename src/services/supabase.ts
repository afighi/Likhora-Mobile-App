import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { decode as decodeBase64 } from 'base64-arraybuffer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth as firebaseAuth } from './firebase';
import { MarkupType, PurchaseMode } from './calculator';
import { BusinessProfile, TaskBlueprint, getBusinessProfile } from './businessProfiles';
import { matchRegistryProfile } from './regulatoryAdvisor';

const SUPABASE_URL = 'https://cljzmisdceuxuzbwmnrz.supabase.co';

export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsanptaXNkY2V1eHV6YndtbnJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NTk0NjksImV4cCI6MjEwMjAzNTQ2OX0.xH-qOsLoGtN1DUj1NYi7UAYpW7XNP8qp9A8o3Ucmsr8';

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
  user_id?: string;
  title: string;
  category: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Skipped';
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

export const isUuid = (value?: string) => Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));

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
const memoryCachedRoadmap: Record<string, RoadmapTask[]> = {};

export const getCachedRoadmapTasks = (userId?: string): RoadmapTask[] | null => {
  const effectiveId = userId || 'guest';
  if (memoryCachedRoadmap[effectiveId] && memoryCachedRoadmap[effectiveId].length > 0) {
    return memoryCachedRoadmap[effectiveId];
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    const key = `likhora_roadmap_${effectiveId}`;
    const raw = window.localStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryCachedRoadmap[effectiveId] = parsed;
          return parsed;
        }
      } catch (e) {}
    }
  }
  return null;
};

export const setCachedRoadmapTasks = (tasks: RoadmapTask[], userId?: string) => {
  const effectiveId = userId || 'guest';
  memoryCachedRoadmap[effectiveId] = tasks;
  if (typeof window !== 'undefined' && window.localStorage) {
    const key = `likhora_roadmap_${effectiveId}`;
    window.localStorage.setItem(key, JSON.stringify(tasks));
  }
  try {
    void AsyncStorage.setItem(`@likhora_roadmap_${effectiveId}`, JSON.stringify(tasks));
    void AsyncStorage.setItem('@likhora_active_roadmap_tasks', JSON.stringify(tasks));
  } catch (err) {
    console.warn('AsyncStorage set error:', err);
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
/**
 * Constructs a comprehensive, phased Philippine startup roadmap that combines
 * trade-specific business execution steps (location, equipment, unit costing, SOPs,
 * and customer acquisition) with the essential Philippine regulatory milestones
 * (DTI, Barangay, Regulatory/Sanitary, Mayor's Permit, and BIR).
 */
export const getDefaultPhilippineRoadmapTasks = (
  userId: string,
  businessType?: string,
  location?: string,
  profile?: BusinessProfile
): RoadmapTask[] => {
  const activeProfile = profile || getBusinessProfile(businessType);
  const regProfile = matchRegistryProfile(businessType || '');

  const regTask: RoadmapTask = {
    id: 'reg-license',
    user_id: userId,
    title: regProfile.roadmapTask.title,
    category: 'Permits',
    status: 'Pending',
    desc: regProfile.roadmapTask.desc,
    step_order: 6,
    agency: regProfile.roadmapTask.agency,
    legal_basis: regProfile.roadmapTask.legal_basis,
    estimated_time: regProfile.roadmapTask.estimated_time,
    estimated_cost: regProfile.roadmapTask.estimated_cost,
    required_docs: regProfile.roadmapTask.required_docs,
    sub_steps: regProfile.roadmapTask.sub_steps,
  };

  const dtiTask: RoadmapTask = {
    id: 'dti',
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
      { id: 'dti-1', title: 'Access official DTI BNRS portal at bnrs.dti.gov.ph', completed: false },
      { id: 'dti-2', title: 'Input proposed business name (Dominant Name + Business Descriptor)', completed: false },
      { id: 'dti-3', title: 'Select territorial scope (City/Municipal) & pay ₱530 via GCash/Maya', completed: false },
      { id: 'dti-4', title: 'Download & print official DTI Certificate of Business Name Registration (Valid 5 Years)', completed: false },
    ],
  };

  const brgyTask: RoadmapTask = {
    id: 'brgy',
    user_id: userId,
    title: `Barangay Micro-Business Clearance in ${location || 'your locality'}`,
    category: 'Permits',
    status: 'Pending',
    desc: 'Mandatory local clearance required before commencing commercial operations.',
    step_order: 4,
    agency: 'Local Barangay Hall BPLO Desk',
    legal_basis: 'RA 9178 (BMBE Act) & RA 7160 Local Government Code',
    estimated_time: '1 - 2 Business Days',
    estimated_cost: '₱200 - ₱500',
    required_docs: ['2 Valid Government IDs', 'Community Tax Certificate (Cedula)', 'Lease Contract / Proof of Address'],
    sub_steps: [
      { id: 'brgy-1', title: 'Request Barangay Business Permit Application Form at Barangay BPLO Desk', completed: false },
      { id: 'brgy-2', title: 'Present 2 Valid Government IDs, Cedula & Lease Contract / Homeowner Consent', completed: false },
      { id: 'brgy-3', title: 'Pay Barangay Clearance Fee (₱200 - ₱500 based on LGU Ordinance)', completed: false },
      { id: 'brgy-4', title: 'Collect signed Barangay Micro-Business Clearance Certificate with official dry seal', completed: false },
    ],
  };

  const mayorTask: RoadmapTask = {
    id: 'mayor',
    user_id: userId,
    title: 'Mayor Business License & BFP Fire Safety Permit',
    category: 'Permits',
    status: 'Pending',
    desc: 'Official City Mayor permit authorizing business operations in your municipality.',
    step_order: 7,
    agency: 'City / Municipal Hall BPLO & Bureau of Fire Protection',
    legal_basis: 'Local Government Code of 1991 (RA 7160 Sec 143/151)',
    estimated_time: '3 - 7 Business Days',
    estimated_cost: '₱1,500 - ₱4,000',
    required_docs: ['DTI Certificate', 'Barangay Clearance', 'BFP Fire Safety Inspection Cert', 'Zoning Clearance'],
    sub_steps: [
      { id: 'mayor-1', title: 'Submit DTI Certificate & Barangay Clearance to City BPLO window', completed: false },
      { id: 'mayor-2', title: 'Undergo BFP Fire Safety Inspection & City Health Sanitary Inspection', completed: false },
      { id: 'mayor-3', title: 'Pay Mayor Permit Fee, Garbage Fee & Sanitary License at City Treasurer', completed: false },
      { id: 'mayor-4', title: 'Claim official Mayor Business Permit, Business Plate & Sanitary Inspection Sticker', completed: false },
    ],
  };

  const birTask: RoadmapTask = {
    id: 'bir',
    user_id: userId,
    title: 'BIR Tax Registration & Official Receipts (Form 1901)',
    category: 'Permits',
    status: 'Pending',
    desc: 'Mandatory tax authority registration for issuance of legal Sales Receipts and Cashless POS setup.',
    step_order: 9,
    agency: 'Bureau of Internal Revenue (BIR Revenue District Office)',
    legal_basis: 'National Internal Revenue Code (NIRC Sec 236) & RR 11-2018',
    estimated_time: '3 - 5 Business Days',
    estimated_cost: '₱530 ARF + ~₱1,000 Receipt Printing',
    required_docs: ['BIR Form 1901', 'DTI Certificate', 'Mayor Permit / Barangay Clearance', '2 Valid IDs'],
    sub_steps: [
      { id: 'bir-1', title: 'File BIR Form 1901 at your assigned BIR Revenue District Office (RDO)', completed: false },
      { id: 'bir-2', title: 'Pay ₱500 Annual Registration Fee (ARF) + ₱30 Loose Documentary Stamp', completed: false },
      { id: 'bir-3', title: 'Register Official Books of Accounts (General Journal & Ledger)', completed: false },
      { id: 'bir-4', title: 'Apply for BIR Authority to Print (ATP) & receive BIR Form 2303 Certificate', completed: false },
    ],
  };

  // If the profile defines dedicated multi-step business execution tasks, weave them
  // into an interleaved, realistic startup timeline so the roadmap is a true business guide.
  if (activeProfile.businessExecutionTasks && activeProfile.businessExecutionTasks.length >= 4) {
    const bTasks = activeProfile.businessExecutionTasks;
    const task0 = blueprintToTask(bTasks[0], userId, 'biz-loc', 1);
    const task1 = blueprintToTask(bTasks[1], userId, 'biz-sup', 3);
    const taskCost = blueprintToTask(bTasks[2], userId, 'biz-cost', 5);
    const taskSop = blueprintToTask(bTasks[3], userId, 'biz-sop', 8);
    const taskLaunch = blueprintToTask(bTasks[bTasks.length - 1], userId, 'biz-launch', 10);

    return [
      task0,      // 1. Feasibility, Location Scouting & Utility Setup
      dtiTask,    // 2. DTI Business Name Registration
      task1,      // 3. Equipment Canvassing & Sourcing
      brgyTask,   // 4. Barangay Micro-Business Clearance
      taskCost,   // 5. Unit Costing, Pricing Strategy & Margin Architecture
      regTask,    // 6. Industry Regulatory Clearance (FDA/Potability/Sanitary/BMBE)
      mayorTask,  // 7. Mayor's Business Permit & Fire Safety
      taskSop,    // 8. Operational SOPs, Quality Control & Workflows
      birTask,    // 9. BIR Tax Registration & Official Receipts
      taskLaunch, // 10. Soft Opening Dry-Run, Customer Acquisition & Loyalty Launch
    ];
  }

  // Graceful fallback for custom business profiles with 2 tasks
  return [
    {
      ...brgyTask,
      step_order: 1,
    },
    {
      ...dtiTask,
      step_order: 2,
    },
    {
      ...mayorTask,
      step_order: 3,
    },
    regTask,
    {
      ...birTask,
      step_order: 5,
    },
    blueprintToTask(activeProfile.operationsTask, userId, 'biz-ops', 6),
    blueprintToTask(activeProfile.launchTask, userId, 'biz-launch', 7),
  ];
};

// ----------------------------------------------------
// Onboarding-driven Roadmap Tailoring
// ----------------------------------------------------
// The full onboarding wizard answers, as saved in `profiles.onboarding_draft`.
export interface OnboardingAnswers {
  selectedCategory?: string;
  customCategory?: string;
  businessNameInput?: string;
  selectedStage?: string;
  experienceLevel?: string;
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
const PERMIT_TASK_MAP: { [permitLabel: string]: string[] } = {
  'Barangay clearance': ['brgy', '1', 'barangay'],
  DTI: ['dti', '2'],
  "Mayor's / Business Permit": ['mayor', '3'],
  BIR: ['bir', '4', '5'],
};

/**
 * Turns the launch checklist into a plan tailored to this user's actual
 * onboarding answers:
 * 1. Skips permits they already hold or marks them complete.
 * 2. Swaps DTI for SEC when incorporating.
 * 3. References the correct location issuing offices (e.g. Malolos BPLO, BIR RDO).
 * 4. Adds beginner guidance tooltips if the user is a first-time entrepreneur.
 * 5. Adapts task sequencing and budget allocations based on starting budget tier.
 * 6. Appends a risk-contingency task built from the specific risks they flagged.
 */
export const tailorRoadmapTasks = (
  tasks: RoadmapTask[],
  answers: OnboardingAnswers,
  riskContingencies: { [risk: string]: string } = RISK_CONTINGENCIES
): RoadmapTask[] => {
  const isFirstTime =
    answers.experienceLevel === 'First-time entrepreneur' ||
    (answers.experienceLevel || '').toLowerCase().includes('first-time') ||
    answers.selectedStage === 'idea';

  const cityName = answers.selectedCity?.name || '';
  const isLowBudget =
    answers.startingBudget?.includes('Below ₱5,000') ||
    answers.startingBudget?.includes('₱5,000–₱10,000') ||
    answers.startingBudget?.includes('₱10,001–₱25,000') ||
    answers.startingBudget?.includes('₱10,000–₱50,000') ||
    answers.startingBudget?.includes('₱25,001–₱50,000');

  let tailored = tasks.map((task) => {
    let t = { ...task };

    // Dynamic issuing offices based on location
    if (cityName) {
      if (t.title.toLowerCase().includes('barangay')) {
        t.agency = `${cityName} Barangay Hall BPLO Desk`;
      } else if (t.title.toLowerCase().includes('mayor')) {
        t.agency = `${cityName} City/Municipal Hall BPLO & BFP`;
      } else if (t.title.toLowerCase().includes('bir')) {
        t.agency = `Bureau of Internal Revenue (BIR RDO - ${cityName})`;
      }
    }

    // Beginner guidance & tooltips for first-time entrepreneurs
    if (isFirstTime) {
      const beginnerTips: string[] = [];
      if (t.title.toLowerCase().includes('barangay')) {
        beginnerTips.push('Beginner Guide: Under RA 9178 (BMBE Act), micro-enterprises pay reduced fees of ₱200–₱500. Ask for the BMBE form at the desk.');
        beginnerTips.push('Bring 2 government-issued IDs, your cedula, and proof of address/lease.');
      } else if (t.title.toLowerCase().includes('dti')) {
        beginnerTips.push('Beginner Guide: Registering under "City/Municipal" territorial scope (₱500 + ₱30 doc stamp) is the most budget-friendly choice.');
        beginnerTips.push('Save the official certificate PDF on your smartphone for quick printing.');
      } else if (t.title.toLowerCase().includes('mayor')) {
        beginnerTips.push("Beginner Guide: You must secure your Barangay Clearance and DTI registration before submitting to the City Hall BPLO window.");
        beginnerTips.push("Ensure your location has BFP fire clearance and sanitary certification.");
      } else if (t.title.toLowerCase().includes('bir')) {
        beginnerTips.push('Beginner Guide: BIR Form 1901 is for sole proprietors. Ask about BMBE tax exemption endorsement if you qualified.');
        beginnerTips.push('Official books of accounts must be registered before your opening day.');
      } else if (t.title.toLowerCase().includes('laundry') || t.title.toLowerCase().includes('wash-dry-fold')) {
        beginnerTips.push('Beginner Guide: Verify water pressure (30–40 PSI) and install dedicated lint traps before starting operations.');
        beginnerTips.push('Use commercial LPG gas dryers to cut electrical consumption by up to 40%.');
      } else if (t.title.toLowerCase().includes('water refilling') || t.title.toLowerCase().includes('potability')) {
        beginnerTips.push('Beginner Guide: Always calibrate your digital TDS meter daily before refilling any customer containers.');
        beginnerTips.push('Ensure a cleanroom double-door partition separates the refilling room from customer waiting areas.');
      } else if (t.category === 'Supplies' || t.category === 'Finance') {
        beginnerTips.push('Beginner Tip: Always ask for wholesale discount pricing (presyong bulto) when canvassing at least 3 suppliers.');
      } else if (t.title.toLowerCase().includes('fda') || t.agency?.toLowerCase().includes('fda')) {
        beginnerTips.push('Beginner Guide: Under RA 10918, you must contract a PRC-registered Pharmacist before filing your FDA eServices LTO application.');
        beginnerTips.push('Maintain a daily temperature log (2°C–8°C) for all cold-chain vaccines and medicines.');
      } else if (t.title.toLowerCase().includes('potability') || t.title.toLowerCase().includes('water')) {
        beginnerTips.push('Beginner Guide: Water potability tests (microbiological & physical-chemical) must be analyzed by a DOH-accredited laboratory under PNSDW standards.');
      } else if (t.title.toLowerCase().includes('sanitary') || t.title.toLowerCase().includes('food')) {
        beginnerTips.push('Beginner Guide: All food service staff must secure pink health cards (stool & chest X-ray) from the City Health Office.');
        beginnerTips.push('Install a grease trap under kitchen washing sinks to pass sanitary inspection.');
      } else if (t.title.toLowerCase().includes('pcab')) {
        beginnerTips.push('Beginner Guide: The Authorized Managing Officer (AMO) must complete the 16-hour AMO seminar before filing the PCAB contractor license.');
      } else if (t.title.toLowerCase().includes('bai') || t.title.toLowerCase().includes('veterinary')) {
        beginnerTips.push('Beginner Guide: Operating an animal facility without BAI Registration incurs penalties under the Animal Welfare Act (RA 8485).');
      }

      if (beginnerTips.length > 0) {
        t.tips = Array.from(new Set([...(t.tips || []), ...beginnerTips]));
      }
    }

    // Budget allocation guidance
    if (isLowBudget && (t.category === 'Supplies' || t.category === 'Finance')) {
      const budgetNote = `Recommended Budget Allocation: Prioritize essential low-cost starter ingredients/equipment first. Reserve at least 20% of your ${answers.startingBudget || 'budget'} for cash buffer.`;
      t.tips = [budgetNote, ...(t.tips || [])];
    }

    // Skip permits already obtained
    const matchedPermit = Object.entries(PERMIT_TASK_MAP).find(
      ([label, identifiers]) => {
        if (!answers.obtainedPermits?.includes(label)) return false;
        const taskTitleLower = t.title.toLowerCase();
        const taskId = t.id || '';
        return (
          identifiers.includes(taskId) ||
          (label === 'Barangay clearance' && taskTitleLower.includes('barangay')) ||
          (label === 'DTI' && taskTitleLower.includes('dti')) ||
          (label === "Mayor's / Business Permit" && taskTitleLower.includes('mayor')) ||
          (label === 'BIR' && taskTitleLower.includes('bir'))
        );
      }
    );
    if (matchedPermit) {
      return {
        ...t,
        status: 'Completed' as const,
        sub_steps: (t.sub_steps || []).map((s) => ({ ...s, completed: true })),
      };
    }

    // Corporations register with the SEC instead of DTI sole-proprietor flow
    if ((t.id === '2' || t.id === 'dti' || t.title.toLowerCase().includes('dti')) && answers.registrationType === 'corporation') {
      return {
        ...t,
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

    return t;
  });

  // Dynamically tailor or inject the industry regulatory permit based on business type
  const effectiveBusiness = answers.customCategory || answers.selectedCategory || answers.businessNameInput || '';
  const regProfile = matchRegistryProfile(effectiveBusiness);

  const regIndex = tailored.findIndex(
    (t) =>
      t.id === 'reg-license' ||
      t.title.toLowerCase().includes('fda') ||
      t.title.toLowerCase().includes('potability') ||
      t.title.toLowerCase().includes('pcab') ||
      t.title.toLowerCase().includes('bai animal') ||
      t.title.toLowerCase().includes('sanitary clearance') ||
      t.title.toLowerCase().includes('bmbe registration')
  );

  if (regIndex !== -1) {
    tailored[regIndex] = {
      ...tailored[regIndex],
      title: regProfile.roadmapTask.title,
      desc: regProfile.roadmapTask.desc,
      agency: regProfile.roadmapTask.agency,
      legal_basis: regProfile.roadmapTask.legal_basis,
      estimated_time: regProfile.roadmapTask.estimated_time,
      estimated_cost: regProfile.roadmapTask.estimated_cost,
      required_docs: regProfile.roadmapTask.required_docs,
      sub_steps: (tailored[regIndex].sub_steps && tailored[regIndex].sub_steps.length > 0)
        ? tailored[regIndex].sub_steps
        : regProfile.roadmapTask.sub_steps,
    };
  } else if (regProfile) {
    const mayorIndex = tailored.findIndex((t) => t.title.toLowerCase().includes('mayor'));
    const insertIdx = mayorIndex !== -1 ? mayorIndex + 1 : Math.min(3, tailored.length);
    const regTask: RoadmapTask = {
      id: 'reg-license',
      user_id: tasks[0]?.user_id || '',
      title: regProfile.roadmapTask.title,
      category: 'Permits',
      status: 'Pending',
      desc: regProfile.roadmapTask.desc,
      step_order: insertIdx + 1,
      agency: regProfile.roadmapTask.agency,
      legal_basis: regProfile.roadmapTask.legal_basis,
      estimated_time: regProfile.roadmapTask.estimated_time,
      estimated_cost: regProfile.roadmapTask.estimated_cost,
      required_docs: regProfile.roadmapTask.required_docs,
      sub_steps: regProfile.roadmapTask.sub_steps,
    };
    tailored.splice(insertIdx, 0, regTask);
  }

  // Renumber step_order sequentially
  tailored = tailored.map((t, idx) => ({
    ...t,
    step_order: idx + 1,
  }));

  // Re-sequence or prioritize cheaper sourcing steps when on low budget tier
  if (isLowBudget) {
    tailored = tailored.map((t) => {
      if (t.sub_steps && t.sub_steps.length > 1) {
        // Sort sub-steps so canvassing / compare bulk prices appears before buying
        const reordered = [...t.sub_steps].sort((a, b) => {
          const aIsCanvass = a.title.toLowerCase().includes('canvass') || a.title.toLowerCase().includes('compare') || a.title.toLowerCase().includes('wet market');
          const bIsCanvass = b.title.toLowerCase().includes('canvass') || b.title.toLowerCase().includes('compare') || b.title.toLowerCase().includes('wet market');
          if (aIsCanvass && !bIsCanvass) return -1;
          if (!aIsCanvass && bIsCanvass) return 1;
          return 0;
        });
        return { ...t, sub_steps: reordered };
      }
      return t;
    });
  }

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

      // Deduplicate tasks by normalized title to prevent ghost rows from prior onboarding/templates
      const seenTitles = new Set<string>();
      const deduplicated: RoadmapTask[] = [];
      merged.forEach((t: RoadmapTask, idx: number) => {
        const norm = (t.title || '').trim().toLowerCase();
        if (norm && !seenTitles.has(norm)) {
          seenTitles.add(norm);
          deduplicated.push({
            ...t,
            step_order: deduplicated.length + 1,
          });
        } else if (!norm) {
          deduplicated.push({
            ...t,
            step_order: deduplicated.length + 1,
          });
        }
      });

      setCachedRoadmapTasks(deduplicated, userId);
      return { data: deduplicated, error };
    }
  } catch (err) {
    console.warn('Supabase fetch error, fallback to cache:', err);
  }

  const cached = getCachedRoadmapTasks(userId);
  if (cached && cached.length > 0) {
    const seenTitles = new Set<string>();
    const deduplicated: RoadmapTask[] = [];
    cached.forEach((t: RoadmapTask) => {
      const norm = (t.title || '').trim().toLowerCase();
      if (norm && !seenTitles.has(norm)) {
        seenTitles.add(norm);
        deduplicated.push({
          ...t,
          step_order: deduplicated.length + 1,
        });
      } else if (!norm) {
        deduplicated.push({
          ...t,
          step_order: deduplicated.length + 1,
        });
      }
    });
    return { data: deduplicated, error: null };
  }
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
  const effectiveUserId = userId || 'guest';
  setCachedRoadmapTasks(tasks, effectiveUserId);
  try {
    const { error: deleteError } = await supabase.from('roadmaps').delete().eq('user_id', effectiveUserId);
    if (!deleteError) {
      return saveUserRoadmap(tasks.map((task, index) => ({
        ...task,
        id: undefined,
        client_key: `step-${index + 1}`,
        user_id: effectiveUserId,
        step_order: index + 1,
      })));
    } else {
      console.warn('replaceUserRoadmap remote delete error, falling back to clean upsert:', deleteError);
      return saveUserRoadmap(tasks.map((task, index) => ({
        ...task,
        client_key: task.client_key || `step-${index + 1}`,
        user_id: effectiveUserId,
        step_order: index + 1,
      })));
    }
  } catch (e) {
    console.warn('replaceUserRoadmap remote delete error (falling back to cache):', e);
  }
  return { data: tasks, error: null };
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

// ----------------------------------------------------
// Business Portfolio (Objective 5) — a compiled, exportable snapshot of the
// user's roadmap + costing + suppliers, alongside their chosen AI-generated
// name/description. Snapshots, not live references, same convention as
// community_posts.template_data — a portfolio stays stable even if the
// source roadmap changes afterward.
// ----------------------------------------------------
export interface BusinessPortfolio {
  id: string;
  user_id: string;
  business_name: string;
  business_description: string;
  ai_name_suggestions: { name: string; tagline: string }[];
  selected_roadmap_snapshot: RoadmapTask[];
  selected_costing_snapshot: Product[];
  selected_suppliers: SupplierItem[];
  exported_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const fetchBusinessPortfolio = async (userId: string) => {
  const { data, error } = await supabase
    .from('business_portfolios')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data: data as BusinessPortfolio | null, error };
};

export const saveBusinessPortfolio = async (
  portfolio: Omit<BusinessPortfolio, 'id' | 'created_at' | 'updated_at'> & { id?: string }
) => {
  const { id, ...rest } = portfolio;
  const payload = { ...rest, updated_at: new Date().toISOString() };

  const { data, error } = id
    ? await supabase.from('business_portfolios').update(payload).eq('id', id).select().single()
    : await supabase.from('business_portfolios').insert(payload).select().single();

  return { data: data as BusinessPortfolio | null, error };
};

// ---------------------------------------------------------------------------
// Verified Seed Community Templates (Philippine MSME Roadmaps)
// ---------------------------------------------------------------------------
export const SEED_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'post-laundry-1',
    author_id: 'founder-mateo-santos',
    author_name: 'Mateo Santos',
    author_avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&q=80',
    business_name: 'Boutique Laundry & Drop-Off Hub',
    business_type: 'Laundry & Dry-Cleaning',
    location: 'Bustos, Bulacan',
    summary: 'A field-tested 6-step operational and legal roadmap for commercial wash-dry-fold laundromats, covering local water/sanitary clearance, BPLO permits, and BMBE tax exemptions.',
    image_url: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=800&q=80',
    created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    template_data: [
      {
        id: 'post-laundry-task-1',
        title: 'Barangay Micro-Business Clearance',
        category: 'Permits',
        status: 'Pending',
        desc: 'Official clearance from the local Barangay Hall certifying commercial operation authorization for laundry & dry cleaning.',
        step_order: 1,
        agency: 'Local Barangay Hall BPLO Desk',
        legal_basis: 'RA 9178 (BMBE Act) & RA 7160 Local Government Code',
        estimated_time: '1 - 2 Business Days',
        estimated_cost: '₱200 - ₱500',
        required_docs: ['2 Valid Government IDs', 'Community Tax Certificate (Cedula)', 'Commercial Lease Contract'],
        sub_steps: [
          { id: 'ls-1-1', title: 'Submit Barangay Business Permit Application Form', completed: false },
          { id: 'ls-1-2', title: 'Present Cedula & Commercial Lease Contract', completed: false },
          { id: 'ls-1-3', title: 'Pay Barangay Clearance Assessment Fee', completed: false },
          { id: 'ls-1-4', title: 'Receive dry-sealed Barangay Business Clearance', completed: false },
        ],
      },
      {
        id: 'post-laundry-task-2',
        title: 'DTI Business Name Registration',
        category: 'Registration',
        status: 'Pending',
        desc: 'Register the sole proprietorship business name with the Department of Trade and Industry for legal national protection.',
        step_order: 2,
        agency: 'Department of Trade and Industry (DTI BNRS)',
        legal_basis: 'Act No. 3883 (Philippine Business Name Law)',
        estimated_time: '30 - 60 Minutes (Online)',
        estimated_cost: '₱530 (City/Municipal Scope)',
        required_docs: ['1 Valid Government ID', 'DTI BNRS Online Form'],
        sub_steps: [
          { id: 'ls-2-1', title: 'Search proposed business name on DTI BNRS portal', completed: false },
          { id: 'ls-2-2', title: 'Fill out owner profile and municipal territorial scope', completed: false },
          { id: 'ls-2-3', title: 'Pay registration fee via GCash or Maya', completed: false },
          { id: 'ls-2-4', title: 'Download official DTI Certificate of Business Name Registration', completed: false },
        ],
      },
      {
        id: 'post-laundry-task-3',
        title: "Mayor's Permit & BPLO Commercial Assessment",
        category: 'Permits',
        status: 'Pending',
        desc: 'City or Municipal Hall license certifying that your laundromat meets zoning, commercial, and engineering standards.',
        step_order: 3,
        agency: 'City/Municipal Hall Business Permits & Licensing Office',
        legal_basis: 'RA 7160 Local Government Code Section 147',
        estimated_time: '3 - 5 Business Days',
        estimated_cost: '₱2,500 - ₱4,500',
        required_docs: ['Barangay Clearance', 'DTI Certificate', 'Lease Contract', 'Locational Clearance'],
        sub_steps: [
          { id: 'ls-3-1', title: 'Secure Locational & Zoning Clearance at City Planning', completed: false },
          { id: 'ls-3-2', title: 'Submit consolidated application to BPLO Window', completed: false },
          { id: 'ls-3-3', title: 'Pay Municipal License Taxes and Garbage Fees', completed: false },
          { id: 'ls-3-4', title: 'Claim Mayor’s Business Permit and official sticker', completed: false },
        ],
      },
      {
        id: 'post-laundry-task-4',
        title: 'Sanitary Clearance & Wastewater Discharge Verification',
        category: 'Health & Safety',
        status: 'Pending',
        desc: 'Compliance with City Health Office and local water district rules for commercial laundry wastewater discharge.',
        step_order: 4,
        agency: 'City/Municipal Health Office & Engineering Dept',
        legal_basis: 'PD 856 (Code on Sanitation of the Philippines) & RA 9275 (Clean Water Act)',
        estimated_time: '2 - 4 Business Days',
        estimated_cost: '₱800 - ₱1,500',
        required_docs: ['Plumbing and Drainage Layout', 'Staff Health Cards', 'Water Potability Test'],
        sub_steps: [
          { id: 'ls-4-1', title: 'Staff medical checkup (stool & x-ray) for City Health Cards', completed: false },
          { id: 'ls-4-2', title: 'Inspect lint trap and wastewater plumbing connection', completed: false },
          { id: 'ls-4-3', title: 'Secure signed Sanitary Permit to Operate', completed: false },
        ],
      },
      {
        id: 'post-laundry-task-5',
        title: 'BIR Registration (Form 1901) & Official Invoicing',
        category: 'Taxes',
        status: 'Pending',
        desc: 'Register business books of accounts, issue official printed sales receipts, and secure Certificate of Registration (Form 2303).',
        step_order: 5,
        agency: 'Bureau of Internal Revenue (BIR RDO)',
        legal_basis: 'National Internal Revenue Code (NIRC) Section 236',
        estimated_time: '2 - 3 Business Days',
        estimated_cost: '₱530 (Doc Stamp & Registration)',
        required_docs: ['BIR Form 1901', 'DTI Certificate', 'Mayor’s Permit', 'Proof of Address'],
        sub_steps: [
          { id: 'ls-5-1', title: 'Submit BIR Form 1901 at designated Revenue District Office', completed: false },
          { id: 'ls-5-2', title: 'Register Official Columnar Books of Accounts', completed: false },
          { id: 'ls-5-3', title: 'Apply for Authority to Print (ATP) Official Receipts/Invoices', completed: false },
          { id: 'ls-5-4', title: 'Display BIR Certificate of Registration (COR 2303) prominently', completed: false },
        ],
      },
      {
        id: 'post-laundry-task-6',
        title: 'DTI BMBE Income Tax Exemption Certification',
        category: 'Compliance',
        status: 'Pending',
        desc: 'Shield your laundry shop with 100% Philippine income tax exemption and minimum wage exemption under the BMBE Act.',
        step_order: 6,
        agency: 'DTI Negosyo Center',
        legal_basis: 'Republic Act No. 9178 (Barangay Micro Business Enterprises Act)',
        estimated_time: '1 - 2 Business Days',
        estimated_cost: 'FREE',
        required_docs: ['DTI Certificate', 'Mayor’s Permit', 'Asset Sworn Affidavit (< ₱3M)'],
        sub_steps: [
          { id: 'ls-6-1', title: 'Fill out BMBE Form 01 at local DTI Negosyo Center', completed: false },
          { id: 'ls-6-2', title: 'Attach Sworn Statement of Assets under ₱3,000,000 threshold', completed: false },
          { id: 'ls-6-3', title: 'Receive Certificate of Authority as BMBE Registered Entity', completed: false },
        ],
      },
    ],
  },
  {
    id: 'post-coffee-1',
    author_id: 'founder-katrina-ramos',
    author_name: 'Katrina Ramos',
    author_avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&q=80',
    business_name: 'Specialty Coffee Cart & Brew Bar',
    business_type: 'Coffee Cart & Beverage Bar',
    location: 'Legazpi Village, Makati City',
    summary: 'Turnkey operational roadmap for mobile coffee carts and pop-up espresso kiosks, covering barista sanitation, electrical specs, and BIR compliance.',
    image_url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80',
    created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    template_data: [
      {
        id: 'post-coffee-task-1',
        title: 'Barangay Commercial & Pop-Up Clearance',
        category: 'Permits',
        status: 'Pending',
        desc: 'Approval from Barangay authorities for operating a mobile coffee bar / kiosk.',
        step_order: 1,
        agency: 'Barangay Hall Public Safety Desk',
        legal_basis: 'RA 7160 & Local Barangay Ordinances',
        estimated_time: '1 - 2 Business Days',
        estimated_cost: '₱300 - ₱500',
        required_docs: ['Valid Government ID', 'Location Agreement / Host Property Consent'],
        sub_steps: [
          { id: 'cs-1-1', title: 'Present space leasing permission or host building endorsement', completed: false },
          { id: 'cs-1-2', title: 'Obtain Barangay Endorsement for Food & Beverage Pop-up', completed: false },
        ],
      },
      {
        id: 'post-coffee-task-2',
        title: 'DTI Sole Proprietorship BNRS',
        category: 'Registration',
        status: 'Pending',
        desc: 'Reserve and register your coffee brand name across the municipal or regional trade area.',
        step_order: 2,
        agency: 'DTI BNRS Online',
        legal_basis: 'Act No. 3883',
        estimated_time: '30 - 45 Minutes',
        estimated_cost: '₱530',
        required_docs: ['1 Valid ID'],
        sub_steps: [
          { id: 'cs-2-1', title: 'Verify name availability on bnrs.dti.gov.ph', completed: false },
          { id: 'cs-2-2', title: 'Complete digital payment and store PDF certificate', completed: false },
        ],
      },
      {
        id: 'post-coffee-task-3',
        title: 'City Health Office Sanitary Permit & Barista Health Cards',
        category: 'Health & Safety',
        status: 'Pending',
        desc: 'Food-grade safety clearances and valid health cards required for all beverage and dairy handling staff.',
        step_order: 3,
        agency: 'City Health Department',
        legal_basis: 'PD 856 Sanitation Code of the Philippines',
        estimated_time: '2 - 3 Business Days',
        estimated_cost: '₱600 - ₱1,200',
        required_docs: ['Chest X-Ray', 'Stool Exam', 'Food Handler Seminar Certificate'],
        sub_steps: [
          { id: 'cs-3-1', title: 'Undergo laboratory medical screenings at accredited clinic', completed: false },
          { id: 'cs-3-2', title: 'Complete Food Handling Seminar at City Health Office', completed: false },
          { id: 'cs-3-3', title: 'Receive barista Food Handler Health Cards with official seal', completed: false },
        ],
      },
      {
        id: 'post-coffee-task-4',
        title: "Mayor's Special Permit for Mobile Food Kiosk",
        category: 'Permits',
        status: 'Pending',
        desc: 'Commercial municipal permit authorizing food cart commerce.',
        step_order: 4,
        agency: 'City BPLO',
        legal_basis: 'Local Government Code Section 147',
        estimated_time: '3 - 5 Business Days',
        estimated_cost: '₱2,000 - ₱3,500',
        required_docs: ['Barangay Clearance', 'DTI Certificate', 'Sanitary Permit', 'Contract of Lease'],
        sub_steps: [
          { id: 'cs-4-1', title: 'Submit BPLO Unified Application with sanitary clearance', completed: false },
          { id: 'cs-4-2', title: 'Collect Mayor’s Permit and official kiosk plate', completed: false },
        ],
      },
      {
        id: 'post-coffee-task-5',
        title: 'BIR Registration & Cashless GCash/Maya Setup',
        category: 'Taxes',
        status: 'Pending',
        desc: 'Register Form 1901 with BIR and generate official QR payment rails for quick cashless orders.',
        step_order: 5,
        agency: 'BIR & FinTech Partner',
        legal_basis: 'NIRC & BSP Digital Payments Framework',
        estimated_time: '2 Business Days',
        estimated_cost: '₱530',
        required_docs: ['BIR Form 1901', 'Mayor’s Permit', 'Bank Account Info'],
        sub_steps: [
          { id: 'cs-5-1', title: 'Obtain BIR COR 2303 and stamp manual invoices', completed: false },
          { id: 'cs-5-2', title: 'Activate official merchant standee QR codes (GCash & Maya)', completed: false },
        ],
      },
    ],
  },
  {
    id: 'post-bakery-1',
    author_id: 'founder-aris-mendoza',
    author_name: 'Chef Aris Mendoza',
    author_avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&q=80',
    business_name: 'Pandesal & Pastry Commissary',
    business_type: 'Bakery & Food Production',
    location: 'Lahug, Cebu City',
    summary: 'Clear step-by-step compliance for neighborhood bakeries, covering gas line inspections, BFP Fire Safety, and oven installation standards.',
    image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80',
    created_at: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
    template_data: [
      {
        id: 'post-bakery-task-1',
        title: 'Barangay Commercial & Zoning Clearance',
        category: 'Permits',
        status: 'Pending',
        desc: 'Barangay authorization for commercial baking equipment and baking odor control.',
        step_order: 1,
        agency: 'Barangay Hall',
        legal_basis: 'RA 7160 Local Government Code',
        estimated_time: '1 - 2 Business Days',
        estimated_cost: '₱300 - ₱600',
        required_docs: ['2 Valid IDs', 'Proof of Address'],
        sub_steps: [
          { id: 'bk-1-1', title: 'Secure Barangay Clearance for Commercial Bakery', completed: false },
        ],
      },
      {
        id: 'post-bakery-task-2',
        title: 'DTI Sole Proprietorship Registration',
        category: 'Registration',
        status: 'Pending',
        desc: 'Register the official bakery trading name with DTI.',
        step_order: 2,
        agency: 'DTI BNRS',
        legal_basis: 'Act No. 3883',
        estimated_time: '1 Hour',
        estimated_cost: '₱530',
        required_docs: ['1 Valid Government ID'],
        sub_steps: [
          { id: 'bk-2-1', title: 'Register trade name on DTI online portal', completed: false },
        ],
      },
      {
        id: 'post-bakery-task-3',
        title: 'BFP Fire Safety Inspection Certificate (FSIC) for Ovens',
        category: 'Safety',
        status: 'Pending',
        desc: 'Bureau of Fire Protection certification validating LPG gas lines and industrial baking oven safety.',
        step_order: 3,
        agency: 'Bureau of Fire Protection (BFP)',
        legal_basis: 'RA 9514 (Fire Code of the Philippines)',
        estimated_time: '3 - 5 Business Days',
        estimated_cost: '₱1,200 - ₱2,500',
        required_docs: ['Oven specs', 'Fire extinguisher installation', 'LPG supplier certification'],
        sub_steps: [
          { id: 'bk-3-1', title: 'Install required dry chemical fire extinguishers next to ovens', completed: false },
          { id: 'bk-3-2', title: 'Schedule BFP inspector visit for gas line verification', completed: false },
          { id: 'bk-3-3', title: 'Receive signed FSIC Certificate', completed: false },
        ],
      },
      {
        id: 'post-bakery-task-4',
        title: "Mayor's Permit & Food Safety Clearance",
        category: 'Permits',
        status: 'Pending',
        desc: 'Official city license certifying sanitary and fire safety compliance for bread production.',
        step_order: 4,
        agency: 'City BPLO & Health Office',
        legal_basis: 'RA 7160 & PD 856',
        estimated_time: '3 - 5 Business Days',
        estimated_cost: '₱2,800 - ₱5,000',
        required_docs: ['BFP FSIC', 'Sanitary Clearance', 'Barangay Clearance'],
        sub_steps: [
          { id: 'bk-4-1', title: 'Submit documents to City Hall BPLO', completed: false },
          { id: 'bk-4-2', title: 'Receive Mayor’s Permit to Operate Bakery', completed: false },
        ],
      },
      {
        id: 'post-bakery-task-5',
        title: 'BIR Registration & Official Delivery Receipts',
        category: 'Taxes',
        status: 'Pending',
        desc: 'Register Form 1901 and print delivery receipts for bakery retail and reseller drop-offs.',
        step_order: 5,
        agency: 'BIR RDO',
        legal_basis: 'NIRC Section 236',
        estimated_time: '2 - 3 Business Days',
        estimated_cost: '₱530',
        required_docs: ['Mayor’s Permit', 'DTI Certificate', 'BIR Form 1901'],
        sub_steps: [
          { id: 'bk-5-1', title: 'Submit BIR Form 1901 and register books', completed: false },
          { id: 'bk-5-2', title: 'Print delivery receipts and invoices via accredited BIR printer', completed: false },
        ],
      },
    ],
  },
  {
    id: 'post-retail-1',
    author_id: 'founder-luzviminda-cruz',
    author_name: 'Luzviminda Cruz',
    author_avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&q=80',
    business_name: 'Aling Nena Modern Mini-Mart & GCash Hub',
    business_type: 'Retail / Sari-Sari Store',
    location: 'Brgy. Commonwealth, Quezon City',
    summary: 'Essential setup guide for neighborhood mini-marts and remittance/digital loading outlets, including Price Tag Law compliance and BMBE tax protection.',
    image_url: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=80',
    created_at: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
    template_data: [
      {
        id: 'post-retail-task-1',
        title: 'Barangay Micro-Business Clearance',
        category: 'Permits',
        status: 'Pending',
        desc: 'Barangay permit for neighborhood grocery and mini-mart store operations.',
        step_order: 1,
        agency: 'Barangay Hall',
        legal_basis: 'RA 9178 & RA 7160',
        estimated_time: '1 Business Day',
        estimated_cost: '₱150 - ₱300',
        required_docs: ['1 Valid ID', 'Cedula'],
        sub_steps: [
          { id: 'rt-1-1', title: 'Pay Barangay fee and receive official clearance sticker', completed: false },
        ],
      },
      {
        id: 'post-retail-task-2',
        title: 'DTI Business Name Registration',
        category: 'Registration',
        status: 'Pending',
        desc: 'Protect retail store trade name with DTI.',
        step_order: 2,
        agency: 'DTI BNRS',
        legal_basis: 'Act No. 3883',
        estimated_time: '30 Minutes',
        estimated_cost: '₱230 - ₱530',
        required_docs: ['1 Valid Government ID'],
        sub_steps: [
          { id: 'rt-2-1', title: 'Complete online application on DTI BNRS', completed: false },
        ],
      },
      {
        id: 'post-retail-task-3',
        title: 'Consumer Act Price Tag Law Compliance (RA 7394)',
        category: 'Compliance',
        status: 'Pending',
        desc: 'Mandatory display of clear, visible price tags on all shelf merchandise before public selling.',
        step_order: 3,
        agency: 'Department of Trade and Industry Fair Trade Enforcement',
        legal_basis: 'Republic Act No. 7394 (Consumer Act of the Philippines) & DTI DAO 10-02',
        estimated_time: '1 Day (Internal)',
        estimated_cost: '₱200 (Price tag stickers/gun)',
        required_docs: ['Price lists', 'Supplier delivery receipts'],
        sub_steps: [
          { id: 'rt-3-1', title: 'Attach individual price tags or clear shelf tags on all goods', completed: false },
          { id: 'rt-3-2', title: 'Verify prices match cash register / calculator pricing', completed: false },
        ],
      },
      {
        id: 'post-retail-task-4',
        title: 'BIR Form 1901 Non-VAT Sole Proprietorship',
        category: 'Taxes',
        status: 'Pending',
        desc: 'Register as Non-VAT retail micro-business with 8% gross income tax or BMBE exemption.',
        step_order: 4,
        agency: 'BIR RDO',
        legal_basis: 'National Internal Revenue Code Section 236',
        estimated_time: '2 Business Days',
        estimated_cost: '₱530',
        required_docs: ['DTI Certificate', 'Barangay Clearance', 'BIR Form 1901'],
        sub_steps: [
          { id: 'rt-4-1', title: 'File BIR Form 1901 and receive Certificate of Registration', completed: false },
        ],
      },
      {
        id: 'post-retail-task-5',
        title: 'Digital Remittance & Merchant QR Setup',
        category: 'Operations',
        status: 'Pending',
        desc: 'Accreditation for GCash Pera Outlet and Maya Center cash-in/cash-out services.',
        step_order: 5,
        agency: 'Bangko Sentral ng Pilipinas (BSP) Accredited Partners',
        legal_basis: 'BSP Circular No. 940 (Rules on Microfinance and Cash Agents)',
        estimated_time: '2 - 3 Business Days',
        estimated_cost: '₱0 - ₱1,000 (Initial Float)',
        required_docs: ['DTI Certificate', 'Valid IDs', 'Store Photos'],
        sub_steps: [
          { id: 'rt-5-1', title: 'Submit partner merchant application on GCash / Maya merchant portal', completed: false },
          { id: 'rt-5-2', title: 'Mount official merchant QR standee on payment counter', completed: false },
        ],
      },
    ],
  },
];

export const fetchCommunityPosts = async () => {
  try {
    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (data && data.length > 0) {
      return { data: data as CommunityPost[], error: null };
    }
  } catch (err) {
    console.warn('Supabase community posts query error:', err);
  }
  return { data: SEED_COMMUNITY_POSTS, error: null };
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
//
// Only 'published' suppliers are shown — 'hidden' rows exist so an admin can
// unpublish a listing (via the Web Admin Portal) without deleting it. This
// column only exists after supabase/15_admin_and_market.sql has been run;
// before that, `status` doesn't exist on the table and this filter would
// error, so it's paired with that migration's rollout.
export const fetchSuppliersFromSupabase = async (category?: string, searchQuery?: string, locationFilter?: string) => {
  try {
    let query = supabase.from('suppliers').select('*').eq('status', 'published');

    if (category && category !== 'All' && category !== 'Nearby') {
      query = query.eq('category', category);
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim();
      query = query.or(`name.ilike.%${q}%,category.ilike.%${q}%,location.ilike.%${q}%`);
    }

    let { data, error } = await query;

    // Fallback: If strict location/query produced no results, fetch all published suppliers
    if ((!data || data.length === 0) && locationFilter) {
      let fallbackQuery = supabase.from('suppliers').select('*').eq('status', 'published');
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
  material_cost?: number | null;
  labor_cost_per_batch?: number | null;

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
    const payload = { ...product, updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('products')
      .insert(payload)
      .select()
      .single();

    // Fallback if labor_cost_per_batch or material_cost columns are not yet in remote DB
    if (error && (error.message?.includes('column') || error.code === '42703')) {
      const { labor_cost_per_batch, material_cost, ...fallbackPayload } = payload as any;
      const fallbackRes = await supabase
        .from('products')
        .insert(fallbackPayload)
        .select()
        .single();
      return { data: fallbackRes.data as Product | null, error: fallbackRes.error };
    }

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
    const payload = { ...updates, updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    // Fallback if labor_cost_per_batch or material_cost columns are not yet in remote DB
    if (error && (error.message?.includes('column') || error.code === '42703')) {
      const { labor_cost_per_batch, material_cost, ...fallbackPayload } = payload as any;
      const fallbackRes = await supabase
        .from('products')
        .update(fallbackPayload)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      return { data: fallbackRes.data as Product | null, error: fallbackRes.error };
    }

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
 * 12_profile_photos.sql. The bucket is public-read because community
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
 * check in 09_smart_calculator.sql's storage policies. Returns a public
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
