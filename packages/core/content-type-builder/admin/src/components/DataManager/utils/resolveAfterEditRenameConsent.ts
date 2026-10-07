import {
  getAttributeRenameDecision,
  type AttributeRenameMigrationMode,
} from '../RenameMigrationModal';

import type { RenameHop } from '../../../types';

export type AfterEditRenameConsent = 'accept' | 'decline' | 'prompt';

/**
 * Decides whether a single rename hop (`oldName -> newName`) performed in the
 * attribute form needs the user's consent to preserve data, given the hops
 * already recorded on the type and the names of chains the user has declined.
 *
 * Consent inherits along a chain, so a chain is always accepted or declined as
 * a whole (replaying a partial chain either fails or silently skips hops):
 *
 * 1. A hop that joins an accepted chain — it continues a recorded hop
 *    (`oldName` was produced by one) or swaps into a name a recorded hop
 *    vacated (`newName`) — is accepted without a prompt.
 * 2. A hop that touches a declined name is declined without a prompt.
 * 3. Otherwise the mode decides; `prompt-after-edit` asks the user.
 */
export const resolveAfterEditRenameConsent = ({
  renames,
  declinedRenameNames,
  oldName,
  newName,
  mode,
}: {
  renames: RenameHop[];
  declinedRenameNames: string[];
  oldName: string;
  newName: string;
  mode: AttributeRenameMigrationMode;
}): AfterEditRenameConsent => {
  const joinsAcceptedChain = renames.some(
    (hop) => hop.newName === oldName || hop.oldName === newName
  );
  if (joinsAcceptedChain) {
    return 'accept';
  }

  const declined = new Set(declinedRenameNames);
  if (declined.has(oldName) || declined.has(newName)) {
    return 'decline';
  }

  const decision = getAttributeRenameDecision(mode);
  if (decision === 'prompt') {
    return 'prompt';
  }

  return decision ? 'accept' : 'decline';
};
