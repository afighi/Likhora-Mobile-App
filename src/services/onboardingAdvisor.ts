/**
 * Khora AI onboarding tailoring for custom business types.
 *
 * The five built-in profiles in services/businessProfiles.ts cover the most
 * common Filipino micro-businesses. When someone picks "Something else" and types
 * their own — a bike repair shop, a printing service, a plant nursery — there
 * is no hand-written profile to fall back on, and asking them about spoilage
 * and wholesale suppliers would repeat exactly the mistake this change is
 * fixing.
 *
 * So Khora builds the profile instead: who buys from this kind of business,
 * what realistically goes wrong, which extra questions are worth asking, and
 * what the two operational roadmap tasks should actually say.
 *
 * If the AI is unreachable or answers badly, the neutral GENERIC_PROFILE is
 * used. It is deliberately written to read correctly for both product and
 * service businesses, so the fallback is bland but never wrong.
 */

import { askKhoraAI } from './claude';
import {
  BusinessProfile,
  ExtraQuestion,
  GENERIC_PROFILE,
  RiskOption,
  TaskBlueprint,
  buildCustomBusinessProfile,
} from './businessProfiles';

const AI_TIMEOUT_MS = 20000;

export interface CustomProfileResult {
  profile: BusinessProfile;
  source: 'khora-ai' | 'offline';
}

const buildPrompt = (businessType: string, location?: string | null): string =>
  [
    `A Filipino micro-entrepreneur is starting a "${businessType}" business${location ? ` in ${location}` : ''}.`,
    '',
    'Build their onboarding profile and comprehensive 5-phase business execution blueprint.',
    'Think carefully about whether this business sells GOODS or sells LABOUR/SERVICES.',
    'Everything must fit Philippine reality: PHP amounts, local agencies (DTI, Barangay, BIR, LGU), and plain language a first-time owner understands.',
    '',
    'Reply with ONLY a JSON object, no markdown fence and no text around it:',
    '{',
    '  "is_product_based": true | false,',
    '  "customer_segments": ["<5 realistic customer groups>"],',
    '  "differentiator_placeholder": "<short example answer in English, starts with e.g.>",',
    '  "risks": [',
    '    { "risk": "<short risk name>", "contingency": "<1 sentence, concrete Philippine action>" }',
    '  ],',
    '  "extra_questions": [',
    '    { "label": "<a question in plain English specific to THIS business>", "options": ["<3-4 short answers>"] }',
    '  ],',
    '  "business_execution_tasks": [',
    '    {',
    '      "title": "<Phase 1: Location, Space Feasibility, Facility Layout or Digital Storefront>",',
    '      "desc": "<1 sentence on feasibility and space setup>",',
    '      "category": "Planning",',
    '      "sub_steps": ["<4 actionable concrete sub-steps>"]',
    '    },',
    '    {',
    '      "title": "<Phase 2: Equipment Canvassing, Machinery, Tools & Direct Supplier Sourcing>",',
    '      "desc": "<1 sentence on sourcing and vendor terms>",',
    '      "category": "Supplies",',
    '      "sub_steps": ["<4 actionable concrete sub-steps>"]',
    '    },',
    '    {',
    '      "title": "<Phase 3: Unit Costing, Pricing Strategy & Profit Margin Architecture>",',
    '      "desc": "<1 sentence on computing costs and margins>",',
    '      "category": "Operations",',
    '      "sub_steps": ["<4 actionable concrete sub-steps>"]',
    '    },',
    '    {',
    '      "title": "<Phase 4: Daily Operational SOPs, Quality Control & Workflows>",',
    '      "desc": "<1 sentence on daily checklists and standards>",',
    '      "category": "Operations",',
    '      "sub_steps": ["<4 actionable concrete sub-steps>"]',
    '    },',
    '    {',
    '      "title": "<Phase 5: Soft Opening Dry-Run, Customer Acquisition & Promotional Kickoff>",',
    '      "desc": "<1 sentence on opening launch and early customers>",',
    '      "category": "Launch",',
    '      "sub_steps": ["<4 actionable concrete sub-steps>"]',
    '    }',
    '  ]',
    '}',
    '',
    'Give 6-8 risks, 2-3 extra questions, and exactly 5 business execution tasks. No markdown anywhere in the values.',
  ].join('\n');

/** Pulls the first balanced {...} block out of a reply, fence or prose included. */
const extractJsonObject = (text: string): any | null => {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    else if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
};

const cleanText = (value: any, maxLength: number): string =>
  typeof value === 'string'
    ? value.replace(/[*_`#]/g, '').replace(/\s+/g, ' ').trim().slice(0, maxLength)
    : '';

const cleanList = (value: any, maxItems: number, maxLength: number): string[] =>
  Array.isArray(value)
    ? value.map((item) => cleanText(item, maxLength)).filter(Boolean).slice(0, maxItems)
    : [];

const parseRisks = (value: any): RiskOption[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => ({
      risk: cleanText(entry?.risk, 48),
      contingency: cleanText(entry?.contingency, 220),
    }))
    .filter((entry) => entry.risk && entry.contingency)
    .slice(0, 8);
};

const parseExtraQuestions = (value: any): ExtraQuestion[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry, index): ExtraQuestion | null => {
      const label = cleanText(entry?.label, 90);
      const options = cleanList(entry?.options, 4, 40);
      if (!label) return null;
      // A question with too few options can't be answered as a choice, so it
      // degrades to free text rather than rendering an unusable single button.
      return options.length >= 2
        ? { id: `ai_q${index + 1}`, label, type: 'choice' as const, options }
        : { id: `ai_q${index + 1}`, label, type: 'text' as const, placeholder: 'Your answer...' };
    })
    .filter((entry): entry is ExtraQuestion => entry !== null)
    .slice(0, 3);
};

/**
 * Builds an array of 5 task blueprints from the AI's response, keeping compliance
 * metadata and categories intact so users get realistic, structured steps.
 */
const parseBusinessExecutionTasks = (
  value: any,
  fallbackTasks: TaskBlueprint[]
): TaskBlueprint[] => {
  if (!Array.isArray(value) || value.length < 4) return fallbackTasks;

  const parsed = value.map((item, idx) => {
    const fallback = fallbackTasks[idx] || fallbackTasks[fallbackTasks.length - 1];
    const title = cleanText(item?.title, 90);
    const desc = cleanText(item?.desc, 220) || fallback.desc;
    const subSteps = cleanList(item?.sub_steps, 6, 160);

    if (!title || subSteps.length < 2) return fallback;

    return {
      ...fallback,
      title,
      desc,
      category: cleanText(item?.category, 30) || fallback.category,
      sub_steps: subSteps,
    };
  });

  return parsed.length >= 4 ? parsed : fallbackTasks;
};

/**
 * Builds a task blueprint from the AI's title/desc/sub_steps, keeping the
 * compliance metadata from the profile — an LLM should not be
 * inventing agencies, legal bases or fee ranges that a user might act on.
 */
const parseTask = (value: any, fallback: TaskBlueprint): TaskBlueprint => {
  const title = cleanText(value?.title, 90);
  const subSteps = cleanList(value?.sub_steps, 6, 160);
  if (!title || subSteps.length < 2) return fallback;

  return {
    ...fallback,
    title,
    desc: cleanText(value?.desc, 200) || fallback.desc,
    sub_steps: subSteps,
  };
};

/**
 * Asks Khora to design onboarding and 5-phase business execution for a business type.
 * Always resolves — an unreachable answer falls back to buildCustomBusinessProfile.
 */
export const generateCustomBusinessProfile = async (
  businessType: string,
  location?: string | null
): Promise<CustomProfileResult> => {
  const named: BusinessProfile = buildCustomBusinessProfile(businessType);

  if (!businessType.trim()) return { profile: named, source: 'offline' };

  try {
    const response = await Promise.race([
      askKhoraAI(
        buildPrompt(businessType, location),
        'You are Khora AI, an expert on Filipino micro-businesses. When asked for JSON, reply with raw JSON only — no prose, no markdown fences.'
      ),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), AI_TIMEOUT_MS)),
    ]);

    if (!response?.success || !response.content) return { profile: named, source: 'offline' };

    const parsed = extractJsonObject(response.content);
    if (!parsed) return { profile: named, source: 'offline' };

    const risks = parseRisks(parsed.risks);
    const customerSegments = cleanList(parsed.customer_segments, 6, 40);

    // Without customers and risks there is nothing to render on steps 4 and 7,
    // which are the steps this whole feature exists to fix.
    if (customerSegments.length < 3 || risks.length < 3) {
      return { profile: named, source: 'offline' };
    }

    const businessExecutionTasks = parseBusinessExecutionTasks(
      parsed.business_execution_tasks,
      named.businessExecutionTasks || []
    );

    return {
      profile: {
        ...named,
        isProductBased: parsed.is_product_based !== false,
        customerSegments,
        differentiatorPlaceholder:
          cleanText(parsed.differentiator_placeholder, 120) || named.differentiatorPlaceholder,
        risks,
        extraQuestions: parseExtraQuestions(parsed.extra_questions),
        businessExecutionTasks,
        operationsTask: businessExecutionTasks[1] || parseTask(parsed.operations_task, named.operationsTask),
        launchTask: businessExecutionTasks[businessExecutionTasks.length - 1] || parseTask(parsed.launch_task, named.launchTask),
      },
      source: 'khora-ai',
    };
  } catch {
    return { profile: named, source: 'offline' };
  }
};
