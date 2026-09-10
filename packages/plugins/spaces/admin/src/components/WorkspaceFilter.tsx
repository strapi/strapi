import { useField } from '@strapi/admin/strapi-admin';
import { Box, Flex, SingleSelect, SingleSelectOption, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useGetMineSpacesQuery } from '../services/spaces';
import { DEFAULT_SPACE_SLUG, getCurrentSpaceSlug } from '../utils/currentSpace';
import { getTranslation } from '../utils/getTranslation';
import { getKnownSpaces } from '../utils/knownSpaces';
import { isWorkspaceColumnRelevant } from './WorkspaceListCell';

import type { Filters } from '@strapi/admin/strapi-admin';
import type { ListLayout } from '@strapi/content-manager/strapi-admin';
import type { MessageDescriptor } from 'react-intl';

/** Value input of the "Workspace" filter: a select of the workspaces. */
export const WorkspaceFilterInput = ({ name }: Filters.ValueInputProps) => {
  const { formatMessage } = useIntl();
  const field = useField<string>(name);
  const { data: spaces = [] } = useGetMineSpacesQuery();

  return (
    <SingleSelect
      aria-label={formatMessage({
        id: getTranslation('filter.input.label'),
        defaultMessage: 'Select a workspace',
      })}
      value={field.value ?? ''}
      onChange={(value) => field.onChange(name, String(value))}
    >
      {spaces.map((space) => (
        <SingleSelectOption key={space.slug} value={space.slug}>
          <Flex alignItems="center" gap={2}>
            <Box
              width="8px"
              height="8px"
              borderRadius="50%"
              background={space.color ?? 'neutral300'}
              shrink={0}
            />
            <Typography variant="omega">{space.name}</Typography>
          </Flex>
        </SingleSelectOption>
      ))}
    </SingleSelect>
  );
};

type InjectableFilter = Omit<Filters.Filter, 'label' | 'operators'> & {
  label: string | MessageDescriptor;
  operators?: Array<{ value: string; label: string | MessageDescriptor }>;
};

interface InjectFiltersHookArgs {
  displayedFilters: InjectableFilter[];
  layout: ListLayout;
}

/**
 * `Admin/CM/pages/ListView/inject-in-filters`: in the default workspace a
 * "Workspace" filter narrows the superset view. It is a relation filter on the
 * workspace slug, so the admin's own filter machinery produces
 * `filters[$and][n][space][slug][$eq]=acme`; the `$null` operator ("is shared")
 * needs no value and reaches the server as `[space][slug][$null]=true`.
 */
export const addWorkspaceFilterHook = (
  { displayedFilters, layout }: InjectFiltersHookArgs,
  // The waterfall passes the Redux store here; tests pass a pathname.
  pathnameOverride?: unknown
) => {
  const pathname =
    typeof pathnameOverride === 'string' ? pathnameOverride : window.location.pathname;
  if (
    getCurrentSpaceSlug() !== DEFAULT_SPACE_SLUG ||
    !isWorkspaceColumnRelevant(layout, pathname)
  ) {
    return { displayedFilters, layout };
  }

  const filter: InjectableFilter = {
    name: 'space',
    type: 'relation',
    mainField: { name: 'slug', type: 'string' },
    label: { id: getTranslation('filter.label'), defaultMessage: 'Workspace' },
    input: WorkspaceFilterInput,
    options: getKnownSpaces().map((space) => ({ label: space.name, value: space.slug })),
    operators: [
      {
        value: '$eq',
        label: { id: 'components.FilterOptions.FILTER_TYPES.$eq', defaultMessage: 'is' },
      },
      {
        value: '$ne',
        label: { id: 'components.FilterOptions.FILTER_TYPES.$ne', defaultMessage: 'is not' },
      },
      {
        value: '$null',
        label: { id: getTranslation('filter.isShared'), defaultMessage: 'is shared' },
      },
      {
        value: '$notNull',
        label: { id: getTranslation('filter.isNotShared'), defaultMessage: 'is not shared' },
      },
    ],
  };

  return { displayedFilters: [...displayedFilters, filter], layout };
};
