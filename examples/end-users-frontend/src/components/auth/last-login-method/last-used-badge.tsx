'use client';

import { useLastLoginMethod } from '@better-auth-ui/react';

import { Badge } from '@/components/ui/badge';

export type LastUsedBadgeProps = {
  /** Login method IDs that should display the indicator. */
  method: string | string[];
  /** Use the shorter label in constrained layouts. */
  compact?: boolean;
  /** Float the compact indicator over the top-right edge of its container. */
  floating?: boolean;
};

/**
 * Displays an indicator when one of the supplied method IDs matches Better
 * Auth's stored last login method.
 */
export function LastUsedBadge({ method, compact, floating }: LastUsedBadgeProps) {
  const { method: lastLoginMethod, localization } = useLastLoginMethod();
  const methods = Array.isArray(method) ? method : [method];

  if (!lastLoginMethod || !methods.includes(lastLoginMethod)) return null;

  return (
    <Badge
      className={
        floating
          ? 'pointer-events-none absolute top-0 right-0 z-10 translate-x-1/4 -translate-y-1/2 shadow-sm'
          : undefined
      }
      variant="secondary"
    >
      {compact || floating ? localization.lastUsedShort : localization.lastUsed}
    </Badge>
  );
}
