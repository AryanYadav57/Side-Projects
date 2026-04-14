import AsyncStorage from '@react-native-async-storage/async-storage';

import { trackEvent } from './analytics';

const EXPERIMENTS_KEY = 'experiments:assignments:v1';

type AssignmentMap = Record<string, string>;

async function readAssignments(): Promise<AssignmentMap> {
  try {
    const raw = await AsyncStorage.getItem(EXPERIMENTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeAssignments(assignments: AssignmentMap): Promise<void> {
  try {
    await AsyncStorage.setItem(EXPERIMENTS_KEY, JSON.stringify(assignments));
  } catch {
    // Keep experiments non-blocking.
  }
}

export async function getOrAssignExperimentVariant(
  experiment: string,
  variants: string[]
): Promise<string> {
  const safeVariants = variants.filter(Boolean);
  if (safeVariants.length === 0) {
    return 'control';
  }

  const assignments = await readAssignments();
  const existing = assignments[experiment];
  if (existing) return existing;

  const picked = safeVariants[Math.floor(Math.random() * safeVariants.length)] || safeVariants[0];
  const next = { ...assignments, [experiment]: picked };
  await writeAssignments(next);
  await trackEvent('experiment_assigned', { experiment, variant: picked });
  return picked;
}

export async function getExperimentVariant(experiment: string): Promise<string | null> {
  const assignments = await readAssignments();
  return assignments[experiment] || null;
}
