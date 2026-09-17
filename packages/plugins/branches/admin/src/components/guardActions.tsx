import { MAIN_SLUG } from '../constants';
import { useCurrentBranchSlug } from '../utils/useSwitchBranch';

import type {
  BulkActionComponent,
  DocumentActionComponent,
} from '@strapi/content-manager/strapi-admin';

const GATED_TYPES = new Set(['publish', 'unpublish', 'discard']);

/**
 * Publishing is not available on a branch (the server answers 403); the
 * matching Content Manager actions are hidden there so the UI does not
 * advertise them. The wrapped action still runs (hooks order stays stable),
 * only its description is dropped off main.
 */
export const guardDocumentAction = (Action: DocumentActionComponent): DocumentActionComponent => {
  if (!Action.type || !GATED_TYPES.has(Action.type)) {
    return Action;
  }

  const Guarded: DocumentActionComponent = (props) => {
    const slug = useCurrentBranchSlug();
    const description = Action(props);
    return slug === MAIN_SLUG ? description : null;
  };
  Guarded.type = Action.type;
  Guarded.position = Action.position;
  Guarded.displayName = `BranchGuarded(${Action.displayName ?? Action.name ?? Action.type})`;

  return Guarded;
};

export const guardBulkAction = (Action: BulkActionComponent): BulkActionComponent => {
  if (!Action.type || !GATED_TYPES.has(Action.type)) {
    return Action;
  }

  const Guarded: BulkActionComponent = (props) => {
    const slug = useCurrentBranchSlug();
    const description = Action(props);
    return slug === MAIN_SLUG ? description : null;
  };
  Guarded.type = Action.type;
  Guarded.displayName = `BranchGuarded(${Action.displayName ?? Action.name ?? Action.type})`;

  return Guarded;
};
