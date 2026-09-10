import { Lock } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { DEFAULT_SPACE_SLUG, getCurrentSpaceSlug } from '../utils/currentSpace';
import { useEntryStates } from '../utils/entryStates';
import { getTranslation } from '../utils/getTranslation';

import type { EntryAccessReason } from '../services/spaces';
import type { HeaderActionComponent } from '@strapi/content-manager/strapi-admin';

export const LOCK_MESSAGES: Record<EntryAccessReason, { id: string; defaultMessage: string }> = {
  'shared-entry': {
    id: getTranslation('lock.sharedEntry'),
    defaultMessage:
      'Read-only: this entry is shared with every workspace. Edit it from the Default workspace.',
  },
  'shared-content-type': {
    id: getTranslation('lock.sharedContentType'),
    defaultMessage:
      'Read-only: entries of this content type are managed from the Default workspace.',
  },
  'other-workspace': {
    id: getTranslation('lock.otherWorkspace'),
    defaultMessage: 'Read-only: this entry belongs to another workspace.',
  },
};

/**
 * Edit-view header lock (`addDocumentHeaderAction`): shown in a sub-workspace
 * on an entry it may not edit, with the reason as the button's label. The
 * inputs themselves are disabled by the RBAC middleware.
 */
export const EntryLockHeaderAction: HeaderActionComponent = ({ documentId, model }) => {
  const { formatMessage } = useIntl();
  const isDefault = getCurrentSpaceSlug() === DEFAULT_SPACE_SLUG;
  const states = useEntryStates(isDefault ? '' : model, documentId ? [documentId] : []);

  const state = documentId ? states[documentId] : undefined;
  if (!state || state.editable) {
    return null;
  }

  return {
    label: formatMessage(LOCK_MESSAGES[state.reason ?? 'shared-entry']),
    icon: <Lock />,
    disabled: true,
  };
};
