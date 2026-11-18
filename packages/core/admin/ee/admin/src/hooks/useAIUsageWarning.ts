import { useEffect, useRef } from 'react';

import { useLocation } from 'react-router-dom';

import { getAdminUserId, useAuth } from '../../../../admin/src/features/Auth';
import { useNotification } from '../../../../admin/src/features/Notifications';
import { useGetAiUsageQuery } from '../services/ai';

import { useAIAvailability } from './useAIAvailability';

const STORAGE_KEY_PREFIX = 'strapi-ai-usage-warning';

const getAIUsageWarningStorageKey = (userId: string | number) => `${STORAGE_KEY_PREFIX}:${userId}`;

const getLocalStorage = (): Storage | null => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
};

const readWarningLevels = (key: string): Set<number> => {
  try {
    const storage = getLocalStorage();
    if (!storage) return new Set<number>();

    const raw = storage.getItem(key);
    if (!raw) return new Set<number>();

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const validNumbers = parsed.filter(
        (item): item is number => typeof item === 'number' && !Number.isNaN(item)
      );
      return new Set<number>(validNumbers);
    }
    return new Set<number>();
  } catch {
    return new Set<number>();
  }
};

const persistWarningLevels = (key: string, levels: Set<number>): void => {
  try {
    const storage = getLocalStorage();
    if (!storage) return;

    if (levels.size === 0) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, JSON.stringify(Array.from(levels)));
    }
  } catch {
    // Gracefully ignore storage failures
  }
};

/**
 * Triggers a warning notification if AI usage is above a threshold (default 80%).
 * @param threshold - Usage percentage (0-1) at which to warn. Default: 0.8 (80%)
 */
export function useAIUsageWarning(threshold: number = 0.8) {
  const location = useLocation();
  const isAuthPage = location.pathname.startsWith('/auth');
  const { toggleNotification } = useNotification();
  const isAIEnabled = useAIAvailability();
  const user = useAuth('useAIUsageWarning', (state) => state.user, false);
  const isAuthLoading = useAuth('useAIUsageWarning', (state) => state.isLoading, false) ?? false;
  const userId = getAdminUserId(user);

  const { data, isLoading, error } = useGetAiUsageQuery(undefined, {
    refetchOnMountOrArgChange: true,
    skip: !isAIEnabled || isAuthPage,
  });

  const previousUserIdRef = useRef<string | number | undefined>(undefined);
  const warningLevelsRef = useRef<Set<number>>(new Set<number>());

  const hasResolvedUser =
    !isAuthLoading && userId !== undefined && userId !== null && userId !== '';

  useEffect(() => {
    if (!hasResolvedUser || userId == null || userId === '') {
      previousUserIdRef.current = undefined;
      warningLevelsRef.current = new Set<number>();
      return;
    }

    const storageKey = getAIUsageWarningStorageKey(userId);

    if (previousUserIdRef.current !== userId) {
      previousUserIdRef.current = userId;
      warningLevelsRef.current = readWarningLevels(storageKey);
    }

    if (isAuthPage || isLoading || error || !data?.subscription?.cmsAiEnabled || !isAIEnabled)
      return;

    const totalCredits = data.subscription.cmsAiCreditsBase;
    const usedCredits = data.cmsAiCreditsUsed;
    const maxCredits = data.subscription.cmsAiCreditsMaxUsage;

    if (!totalCredits || totalCredits <= 0) return;

    const percentUsed = usedCredits / totalCredits;

    const percentDisplay = Math.round(percentUsed * 100);
    const remaining = Math.max(totalCredits - usedCredits, 0);

    if (percentUsed >= 1 && !warningLevelsRef.current.has(100)) {
      const hasOverageAllowance = maxCredits && maxCredits > totalCredits;

      if (hasOverageAllowance) {
        // Overages notification (error style)
        toggleNotification({
          type: 'danger',
          message: `You've used 100% of your AI credits. Overages are being applied.`,
          timeout: 5000,
        });
      } else {
        // No overages allowed - credits exhausted
        toggleNotification({
          type: 'danger',
          message: `You've exhausted your AI credits. No additional credits available.`,
          timeout: 5000,
        });
      }
      warningLevelsRef.current.add(100);
      persistWarningLevels(storageKey, warningLevelsRef.current);
    } else if (percentUsed >= 0.9 && percentUsed < 1 && !warningLevelsRef.current.has(90)) {
      // 90% warning notification
      toggleNotification({
        type: 'warning',
        message: `You've used ${percentDisplay}% of your AI credits. ${remaining} remain.`,
        timeout: 5000,
      });
      warningLevelsRef.current.add(90);
      persistWarningLevels(storageKey, warningLevelsRef.current);
    } else if (
      percentUsed >= threshold &&
      percentUsed < 0.9 &&
      !warningLevelsRef.current.has(Math.round(threshold * 100))
    ) {
      // Initial threshold warning (default 80%)
      toggleNotification({
        type: 'warning',
        message: `You've used ${percentDisplay}% of your AI credits. ${remaining} remain.`,
        timeout: 5000,
      });
      warningLevelsRef.current.add(Math.round(threshold * 100));
      persistWarningLevels(storageKey, warningLevelsRef.current);
    }

    // Reset warnings if usage drops significantly (e.g., below 70%)
    if (percentUsed < 0.7) {
      warningLevelsRef.current.clear();
      persistWarningLevels(storageKey, warningLevelsRef.current);
    }
  }, [
    data,
    hasResolvedUser,
    isLoading,
    error,
    threshold,
    toggleNotification,
    isAIEnabled,
    isAuthPage,
    userId,
  ]);
}

export { STORAGE_KEY_PREFIX, getAIUsageWarningStorageKey };
