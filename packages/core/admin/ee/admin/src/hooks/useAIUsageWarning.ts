import { useEffect, useRef } from 'react';

import { useLocation } from 'react-router-dom';

import { useNotification } from '../../../../admin/src/features/Notifications';
import { useGetAIUsageQuery } from '../services/ai';

import { useAIAvailability } from './useAIAvailability';

/**
 * Triggers a warning notification if AI usage is above a threshold (default 80%).
 * @param threshold - Usage percentage (0-1) at which to warn. Default: 0.8 (80%)
 */
export function useAIUsageWarning(threshold: number = 0.8) {
  const location = useLocation();
  const isAuthPage = location.pathname.startsWith('/auth');
  const { toggleNotification } = useNotification();
  const isAIEnabled = useAIAvailability();
  const { data, isLoading, error } = useGetAIUsageQuery(undefined, {
    refetchOnMountOrArgChange: true,
    skip: !isAIEnabled || isAuthPage,
  });
  const hasWarnedRef = useRef(false);

  useEffect(() => {
    if (isAuthPage || isLoading || error || !data?.subscription?.cmsAiEnabled || !isAIEnabled)
      return;

    const totalCredits = data.subscription.cmsAiCreditsBase;
    const usedCredits = data.cmsAiCreditsUsed;

    if (!totalCredits || totalCredits <= 0) return;

    const percentUsed = usedCredits / totalCredits;

    const percentDisplay = Math.round(percentUsed * 100);
    const remaining = Math.max(totalCredits - usedCredits, 0);

    if (percentUsed >= 1 && !hasWarnedRef.current) {
      // Overages notification (error style)
      toggleNotification({
        type: 'danger',
        message: `You’ve used 100% of your AI credits. Overages are being applied.`,
      });
      hasWarnedRef.current = true;
    } else if (percentUsed >= threshold && percentUsed < 1 && !hasWarnedRef.current) {
      // Near exhaustion notification (warning style)
      toggleNotification({
        type: 'warning',
        message: `You’ve used ${percentDisplay}% of your AI credits. ${remaining} remain.`,
      });
      hasWarnedRef.current = true;
    } else if (percentUsed < threshold) {
      hasWarnedRef.current = false;
    }
  }, [data, isLoading, error, threshold, toggleNotification, isAIEnabled, isAuthPage]);
}
