import { createContext } from 'react';

/**
 * Context for managing CTB (Content Type Builder) session tracking.
 *
 * Session Lifecycle:
 * - Created: When CTBSessionProvider mounts
 * - Regenerated: After server restart, when navigating back to CTB from another page
 * - Used: Automatically attached to all CTB tracking events
 *
 * The session ID groups related tracking events together to understand user workflows
 * within a single CTB session.
 */
export interface CTBSessionContextValue {
  /**
   * Unique identifier for the current CTB session
   * Format: ctb-{uuid}
   */
  sessionId: string | undefined;

  /**
   * Generates and sets a new session ID
   * Called when starting a new CTB session (e.g., after navigation or server restart)
   */
  regenerateSessionId: () => void;
}

export const CTBSessionContext = createContext<CTBSessionContextValue | null>(null);
