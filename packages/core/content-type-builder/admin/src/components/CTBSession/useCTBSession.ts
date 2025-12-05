import { useContext } from 'react';

import { CTBSessionContext } from './sessionContext';

/**
 * Hook to access the current CTB session context.
 *
 * @throws Error if used outside of CTBSessionProvider
 * @returns The CTB session context containing sessionId and regenerateSessionId
 *
 * @example
 * ```tsx
 * const { sessionId, regenerateSessionId } = useCTBSession();
 * ```
 */
export const useCTBSession = () => {
  const context = useContext(CTBSessionContext);

  if (!context) {
    throw new Error('useCTBSession must be used within a CTBSessionProvider');
  }

  return context;
};
