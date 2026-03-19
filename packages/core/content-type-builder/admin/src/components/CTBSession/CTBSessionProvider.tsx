import { useState, useCallback, useMemo, type ReactNode } from 'react';

import { CTBSessionContext } from './sessionContext';

interface CTBSessionProviderProps {
  children: ReactNode;
}

/**
 * Generates a unique session identifier for CTB tracking
 * Uses crypto.randomUUID() for guaranteed uniqueness and readability
 *
 * @returns Session ID in format: ctb-{uuid}
 */
export const generateSessionId = (): string | undefined => {
  if (crypto.randomUUID) {
    return `ctb-${crypto.randomUUID()}`;
  }
};

/**
 * Provider for CTB session tracking context.
 *
 * This provider should wrap components that need to track CTB events with session IDs.
 * It manages the session ID lifecycle and provides methods to regenerate it when needed.
 *
 * Usage:
 * ```tsx
 * <CTBSessionProvider>
 *       {children}
 * </CTBSessionProvider>
 * ```
 */
export const CTBSessionProvider = ({ children }: CTBSessionProviderProps) => {
  const [sessionId, setSessionId] = useState(() => generateSessionId());

  const regenerateSessionId = useCallback(() => {
    setSessionId(generateSessionId());
  }, []);

  const value = useMemo(
    () => ({
      sessionId,
      regenerateSessionId,
    }),
    [sessionId, regenerateSessionId]
  );

  return <CTBSessionContext.Provider value={value}>{children}</CTBSessionContext.Provider>;
};
