import { DEFAULT_SPACE_SLUG, getCurrentSpaceSlug } from '../utils/currentSpace';
import { getTranslation } from '../utils/getTranslation';
import { getKnownSpaces } from '../utils/knownSpaces';
import { WorkspaceChip } from './WorkspaceChip';
import { WorkspaceFilterInput } from './WorkspaceFilter';

import type { Filters } from '@strapi/admin/strapi-admin';
import type { IntlShape } from 'react-intl';

interface AuditLogWithSpace {
  space?: { slug: string; name: string; color: string | null } | null;
}

/** "Workspace" cell of the audit logs table: the workspace the action was performed in. */
export const AuditLogWorkspaceCell = ({ log }: { log: unknown }) => {
  const space = (log as AuditLogWithSpace)?.space ?? null;
  return space ? <WorkspaceChip space={space} /> : <span>-</span>;
};

export const isDefaultWorkspace = () => getCurrentSpaceSlug() === DEFAULT_SPACE_SLUG;

/**
 * "Workspace" filter of the audit logs page (default workspace only — a
 * sub-workspace only ever sees its own logs). A relation filter on the slug,
 * mapped by the admin to `filters[$and][n][space][slug][$eq]=acme`.
 */
export const getAuditLogWorkspaceFilter = (
  formatMessage: IntlShape['formatMessage']
): Filters.Filter | null => {
  if (!isDefaultWorkspace()) {
    return null;
  }
  return {
    name: 'space',
    type: 'relation',
    mainField: { name: 'slug', type: 'string' },
    label: formatMessage({ id: getTranslation('filter.label'), defaultMessage: 'Workspace' }),
    input: WorkspaceFilterInput,
    options: getKnownSpaces().map((space) => ({ label: space.name, value: space.slug })),
    operators: [
      {
        value: '$eq',
        label: formatMessage({
          id: 'components.FilterOptions.FILTER_TYPES.$eq',
          defaultMessage: 'is',
        }),
      },
      {
        value: '$ne',
        label: formatMessage({
          id: 'components.FilterOptions.FILTER_TYPES.$ne',
          defaultMessage: 'is not',
        }),
      },
    ],
  };
};
