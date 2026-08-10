import { useEffect } from 'react';

import { useLocation } from 'react-router-dom';

import { useNotification } from '../../../../admin/src/features/Notifications';
import { useGetAiUsageQuery } from '../services/ai';

import { useAIAvailability } from './useAIAvailability';

const STORAGE_KEY = 'strapi-notification-ai-usage';

interface WarnedLevels {
  term: string;
  levels: number[];
}

const readWarnedLevels = (term: string) => {
  try {
    const stored: WarnedLevels | null = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? 'null'
    );

    return new Set<number>(stored?.term === term ? stored.levels : []);
  } catch {
    return new Set<number>();
  }
};

const writeWarnedLevels = (term: string, levels: Set<number>) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ term, levels: [...levels] }));
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
  const { data, isLoading, error } = useGetAiUsageQuery(undefined, {
    refetchOnMountOrArgChange: true,
    skip: !isAIEnabled || isAuthPage,
  });

  useEffect(() => {
    if (isAuthPage || isLoading || error || !data?.subscription?.cmsAiEnabled || !isAIEnabled)
      return;

    const totalCredits = data.subscription.cmsAiCreditsBase;
    const usedCredits = data.cmsAiCreditsUsed;
    const maxCredits = data.subscription.cmsAiCreditsMaxUsage;

    if (!totalCredits || totalCredits <= 0) return;

    const term = data.subscription.currentTermStart;
    const warnedLevels = readWarnedLevels(term);

    const percentUsed = usedCredits / totalCredits;

    const percentDisplay = Math.round(percentUsed * 100);
    const remaining = Math.max(totalCredits - usedCredits, 0);

    if (percentUsed >= 1 && !warnedLevels.has(100)) {
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
      warnedLevels.add(100);
      writeWarnedLevels(term, warnedLevels);
    } else if (percentUsed >= 0.9 && percentUsed < 1 && !warnedLevels.has(90)) {
      // 90% warning notification
      toggleNotification({
        type: 'warning',
        message: `You've used ${percentDisplay}% of your AI credits. ${remaining} remain.`,
        timeout: 5000,
      });
      warnedLevels.add(90);
      writeWarnedLevels(term, warnedLevels);
    } else if (
      percentUsed >= threshold &&
      percentUsed < 0.9 &&
      !warnedLevels.has(Math.round(threshold * 100))
    ) {
      // Initial threshold warning (default 80%)
      toggleNotification({
        type: 'warning',
        message: `You've used ${percentDisplay}% of your AI credits. ${remaining} remain.`,
        timeout: 5000,
      });
      warnedLevels.add(Math.round(threshold * 100));
      writeWarnedLevels(term, warnedLevels);
    }

    // Reset warnings if usage drops significantly (e.g., below 70%)
    if (percentUsed < 0.7) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [data, isLoading, error, threshold, toggleNotification, isAIEnabled, isAuthPage]);
}
