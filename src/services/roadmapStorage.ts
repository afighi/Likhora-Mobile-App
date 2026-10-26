import AsyncStorage from '@react-native-async-storage/async-storage';
import { RoadmapTask } from './supabase';

export interface UserSavedRoadmap {
  id: string;
  title: string;
  category?: string;
  businessType?: string;
  location?: string;
  templateId?: string;
  tasks: RoadmapTask[];
  updatedAt: string;
  createdAt?: string;
}

export const SAVED_ROADMAPS_KEY = '@likhora_saved_user_roadmaps';
export const ACTIVE_ROADMAP_ID_KEY = '@likhora_active_roadmap_id';
export const ACTIVE_ROADMAP_TITLE_KEY = '@likhora_active_roadmap_title';
export const ACTIVE_ROADMAP_TASKS_KEY = '@likhora_active_roadmap_tasks';

/**
 * Loads all user roadmaps saved locally in AsyncStorage.
 */
export const getSavedRoadmaps = async (): Promise<UserSavedRoadmap[]> => {
  try {
    const raw = await AsyncStorage.getItem(SAVED_ROADMAPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Error reading saved roadmaps from storage:', e);
    return [];
  }
};

/**
 * Persists the complete list of user saved roadmaps.
 */
export const saveAllRoadmaps = async (roadmaps: UserSavedRoadmap[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(SAVED_ROADMAPS_KEY, JSON.stringify(roadmaps));
  } catch (e) {
    console.warn('Error saving roadmaps to storage:', e);
  }
};

/**
 * Gets the active roadmap ID and title from storage.
 */
export const getActiveRoadmapMeta = async (): Promise<{ id: string | null; title: string | null }> => {
  try {
    const id = await AsyncStorage.getItem(ACTIVE_ROADMAP_ID_KEY);
    const title = await AsyncStorage.getItem(ACTIVE_ROADMAP_TITLE_KEY);
    return { id, title };
  } catch (e) {
    return { id: null, title: null };
  }
};

/**
 * Sets the active roadmap ID and title in storage.
 */
export const setActiveRoadmapMeta = async (id: string, title: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(ACTIVE_ROADMAP_ID_KEY, id);
    await AsyncStorage.setItem(ACTIVE_ROADMAP_TITLE_KEY, title);
  } catch (e) {
    console.warn('Error setting active roadmap meta:', e);
  }
};

/**
 * Updates the tasks of the active roadmap inside saved roadmaps as well as active storage.
 */
export const syncActiveRoadmapTasks = async (
  activeId: string,
  updatedTasks: RoadmapTask[]
): Promise<UserSavedRoadmap[]> => {
  try {
    await AsyncStorage.setItem(ACTIVE_ROADMAP_TASKS_KEY, JSON.stringify(updatedTasks));
    const all = await getSavedRoadmaps();
    const updated = all.map((r) => {
      if (r.id === activeId) {
        return {
          ...r,
          tasks: updatedTasks,
          updatedAt: new Date().toISOString(),
        };
      }
      return r;
    });
    await saveAllRoadmaps(updated);
    return updated;
  } catch (e) {
    console.warn('Error syncing active roadmap tasks:', e);
    return [];
  }
};

/**
 * Switches the active roadmap to another saved roadmap, saving the current one first.
 */
export const switchRoadmap = async (
  targetId: string,
  currentTasksToSave?: RoadmapTask[],
  currentActiveId?: string
): Promise<{ activeRoadmap: UserSavedRoadmap | null; allRoadmaps: UserSavedRoadmap[] }> => {
  const all = await getSavedRoadmaps();

  let list = all;
  if (currentActiveId && currentTasksToSave && currentTasksToSave.length > 0) {
    list = list.map((r) =>
      r.id === currentActiveId
        ? { ...r, tasks: currentTasksToSave, updatedAt: new Date().toISOString() }
        : r
    );
  }

  const target = list.find((r) => r.id === targetId);
  if (target) {
    await setActiveRoadmapMeta(target.id, target.title);
    await AsyncStorage.setItem(ACTIVE_ROADMAP_TASKS_KEY, JSON.stringify(target.tasks));
    await saveAllRoadmaps(list);
    return { activeRoadmap: target, allRoadmaps: list };
  }

  return { activeRoadmap: null, allRoadmaps: list };
};

/**
 * Deletes a roadmap from the saved list. If the deleted roadmap was active,
 * switches to the first remaining roadmap if any exist.
 */
export const deleteSavedRoadmap = async (
  idToDelete: string,
  currentActiveId: string
): Promise<{ newActive: UserSavedRoadmap | null; remaining: UserSavedRoadmap[] }> => {
  const all = await getSavedRoadmaps();
  const remaining = all.filter((r) => r.id !== idToDelete);
  await saveAllRoadmaps(remaining);

  if (currentActiveId === idToDelete && remaining.length > 0) {
    const next = remaining[0];
    await setActiveRoadmapMeta(next.id, next.title);
    await AsyncStorage.setItem(ACTIVE_ROADMAP_TASKS_KEY, JSON.stringify(next.tasks));
    return { newActive: next, remaining };
  }

  return { newActive: null, remaining };
};

/**
 * Helper to calculate completion stats for any roadmap.
 */
export const getRoadmapProgress = (tasks: RoadmapTask[]) => {
  if (!tasks || tasks.length === 0) {
    return { completed: 0, total: 0, percent: 0, inProgress: 0 };
  }
  const completed = tasks.filter((t) => t.status === 'Completed').length;
  const skipped = tasks.filter((t) => t.status === 'Skipped').length;
  const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
  const effectiveTotal = Math.max(tasks.length - skipped, 0);
  const percent = effectiveTotal > 0
    ? Math.round((completed / effectiveTotal) * 100)
    : (tasks.length > 0 && completed > 0 ? 100 : 0);
  return { completed, total: tasks.length, effectiveTotal, percent, inProgress };
};
