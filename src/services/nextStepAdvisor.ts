/**
 * Objective 4's AI half: given the user's roadmap, recommend what to do
 * next. Picking WHICH task is next is deterministic (first non-completed
 * task in step order) — that's not something an LLM should guess at when
 * the answer is already in the data. Khora AI's job is only the short,
 * contextual REASON shown alongside it, grounded in the user's actual
 * progress rather than a canned tip.
 */

import { askKhoraAI } from './claude';
import { extractJsonObject, cleanText } from '@/utils/json';
import { RoadmapTask } from './supabase';

const AI_TIMEOUT_MS = 10000;

export interface NextStepRecommendation {
  allComplete: boolean;
  task: RoadmapTask | null;
  reason: string;
  source: 'khora-ai' | 'offline';
}

const buildPrompt = (task: RoadmapTask, completed: RoadmapTask[], remaining: RoadmapTask[]): string =>
  [
    'You are Khora AI, guiding a Filipino micro-entrepreneur through their business roadmap.',
    '',
    `COMPLETED SO FAR (${completed.length}): ${completed.map((t) => t.title).join(', ') || 'none yet'}`,
    `NEXT TASK: "${task.title}" (category: ${task.category})`,
    task.desc ? `Task description: ${task.desc}` : '',
    `REMAINING AFTER THIS (${remaining.length - 1}): ${remaining.slice(1, 5).map((t) => t.title).join(', ')}`,
    '',
    'TASK',
    'Write ONE short, encouraging sentence (max ~25 words) explaining why this specific',
    'task is the right thing to focus on next, referencing their actual progress. No markdown.',
    '',
    'Reply with ONLY a JSON object:',
    '{ "reason": "<one short sentence>" }',
  ]
    .filter(Boolean)
    .join('\n');

const offlineReason = (task: RoadmapTask, completedCount: number): string =>
  completedCount === 0
    ? `Start with "${task.title}" — it's the first step on your roadmap.`
    : `You've completed ${completedCount} step${completedCount === 1 ? '' : 's'} — "${task.title}" is next in line.`;

/**
 * Deterministically picks the next Pending/In Progress task in step order,
 * then asks Khora AI for a short reason. Falls back to a plain, still-useful
 * sentence if the AI is unreachable.
 */
export const getNextStepRecommendation = async (tasks: RoadmapTask[]): Promise<NextStepRecommendation> => {
  const ordered = [...tasks].sort((a, b) => (a.step_order ?? 0) - (b.step_order ?? 0));
  const completed = ordered.filter((t) => t.status === 'Completed');
  const remaining = ordered.filter((t) => t.status !== 'Completed');

  if (remaining.length === 0) {
    return { allComplete: true, task: null, reason: '', source: 'offline' };
  }

  const nextTask = remaining[0];
  const offline: NextStepRecommendation = {
    allComplete: false,
    task: nextTask,
    reason: offlineReason(nextTask, completed.length),
    source: 'offline',
  };

  try {
    const response = await Promise.race([
      askKhoraAI(
        buildPrompt(nextTask, completed, remaining),
        'You are Khora AI, a Filipino MSME startup coach. When asked for JSON, reply with raw JSON only — no prose, no markdown fences.'
      ),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), AI_TIMEOUT_MS)),
    ]);

    if (!response?.success || !response.content) return offline;

    const parsed = extractJsonObject(response.content);
    const reason = cleanText(parsed?.reason, 200);
    if (!reason) return offline;

    return { allComplete: false, task: nextTask, reason, source: 'khora-ai' };
  } catch {
    return offline;
  }
};
