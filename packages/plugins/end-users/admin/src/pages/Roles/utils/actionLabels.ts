import { getTranslation } from '../../../utils/getTranslation';

import type { DataAction } from '../../../../../shared/contracts/permissions';
import type { MessageDescriptor } from 'react-intl';

/** What each data action is called wherever the role editor names one outside its own columns */
const ACTION_MESSAGES: Record<DataAction, MessageDescriptor> = {
  find: { id: getTranslation('roles.action.find'), defaultMessage: 'Find' },
  findOne: { id: getTranslation('roles.action.find-one'), defaultMessage: 'Find one' },
  create: { id: getTranslation('roles.action.create'), defaultMessage: 'Create' },
  update: { id: getTranslation('roles.action.update'), defaultMessage: 'Update' },
  delete: { id: getTranslation('roles.action.delete'), defaultMessage: 'Delete' },
  'read-drafts': {
    id: getTranslation('roles.action.read-drafts'),
    defaultMessage: 'Read drafts',
  },
  publish: { id: getTranslation('roles.action.publish'), defaultMessage: 'Publish' },
};

export { ACTION_MESSAGES };
