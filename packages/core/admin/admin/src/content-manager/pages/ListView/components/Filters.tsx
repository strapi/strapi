import * as React from 'react';

import { Combobox, ComboboxOption, useCollator } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { Filters } from '../../../../components/Filters';
import { useField } from '../../../../components/Form';
import { useAuth } from '../../../../features/Auth';
import { useTracking } from '../../../../features/Tracking';
import { useEnterprise } from '../../../../hooks/useEnterprise';
import { useQueryParams } from '../../../../hooks/useQueryParams';
import { useAdminUsers } from '../../../../services/users';
import { getDisplayName } from '../../../../utils/users';
import { CREATOR_FIELDS } from '../../../constants/attributes';
import { useContentTypeSchema } from '../../../hooks/useContentTypeSchema';
import { Schema } from '../../../hooks/useDocument';
import { useGetContentTypeConfigurationQuery } from '../../../services/contentTypes';
import { getMainField } from '../../../utils/attributes';

const REVIEW_WORKFLOW_FILTER_CE: Filters.Filter[] = [];

/**
 * If new attributes are added, this list needs to be updated.
 */
const NOT_ALLOWED_FILTERS = [
  'json',
  'component',
  'media',
  'richtext',
  'dynamiczone',
  'password',
  'blocks',
];
const DEFAULT_ALLOWED_FILTERS = ['createdAt', 'updatedAt'];
const USER_FILTER_ATTRIBUTES = [...CREATOR_FIELDS, 'strapi_assignee'];

/* -------------------------------------------------------------------------------------------------
 * Filters
 * -----------------------------------------------------------------------------------------------*/
interface FiltersProps {
  disabled?: boolean;
  schema: Schema;
}

const FiltersImpl = ({ disabled, schema }: FiltersProps) => {
  const { attributes, uid: model, options } = schema;
  const { formatMessage, locale } = useIntl();
  const { trackUsage } = useTracking();
  const allPermissions = useAuth('FiltersImpl', (state) => state.permissions);
  const [{ query }] = useQueryParams<Filters.Query>();
  const { schemas } = useContentTypeSchema();

  const canReadAdminUsers = React.useMemo(
    () =>
      allPermissions.filter(
        (permission) => permission.action === 'admin::users.read' && permission.subject === null
      ).length > 0,
    [allPermissions]
  );

  const selectedUserIds = (query?.filters?.$and ?? []).reduce<string[]>((acc, filter) => {
    const [key, value] = Object.entries(filter)[0];
    if (typeof value.id !== 'object') {
      return acc;
    }

    const id = value.id.$eq || value.id.$ne;

    if (id && USER_FILTER_ATTRIBUTES.includes(key) && !acc.includes(id)) {
      acc.push(id);
    }

    return acc;
  }, []);

  const { data: userData, isLoading: isLoadingAdminUsers } = useAdminUsers(
    { filters: { id: { $in: selectedUserIds } } },
    {
      // fetch the list of admin users only if the filter contains users and the
      // current user has permissions to display users
      skip: selectedUserIds.length === 0 || !canReadAdminUsers,
    }
  );

  const { users = [] } = userData ?? {};

  const { metadata } = useGetContentTypeConfigurationQuery(model, {
    selectFromResult: ({ data }) => ({ metadata: data?.contentType.metadatas ?? {} }),
  });

  const formatter = useCollator(locale, {
    sensitivity: 'base',
  });

  const displayedAttributeFilters = React.useMemo(() => {
    const [{ properties: { fields = [] } = { fields: [] } }] = allPermissions.filter(
      (permission) =>
        permission.action === 'plugin::content-manager.explorer.read' &&
        permission.subject === model
    );

    const allowedFields = fields.filter((field) => {
      const attribute = attributes[field] ?? {};

      return attribute.type && !NOT_ALLOWED_FILTERS.includes(attribute.type);
    });

    return [
      'id',
      ...allowedFields,
      ...DEFAULT_ALLOWED_FILTERS,
      ...(canReadAdminUsers ? CREATOR_FIELDS : []),
    ]
      .map((name) => {
        const attribute = attributes[name];

        if (NOT_ALLOWED_FILTERS.includes(attribute.type)) {
          return null;
        }

        const { mainField: mainFieldName = '', label } = metadata[name].list;

        let filter: Filters.Filter = {
          name,
          label: label ?? '',
          mainField: getMainField(attribute, mainFieldName, { schemas, components: {} }),
          // @ts-expect-error – TODO: this is filtered out above in the `allowedFields` call but TS complains, is there a better way to solve this?
          type: attribute.type,
        };

        if (
          attribute.type === 'relation' &&
          'target' in attribute &&
          attribute.target === 'admin::user'
        ) {
          filter = {
            ...filter,
            input: AdminUsersFilter,
            options: users.map((user) => ({
              label: getDisplayName(user, formatMessage),
              value: user.id.toString(),
            })),
            operators: [
              {
                label: formatMessage({
                  id: 'components.FilterOptions.FILTER_TYPES.$eq',
                  defaultMessage: 'is',
                }),
                value: '$eq',
              },
              {
                label: formatMessage({
                  id: 'components.FilterOptions.FILTER_TYPES.$ne',
                  defaultMessage: 'is not',
                }),
                value: '$ne',
              },
            ],
            mainField: {
              name: 'id',
              type: 'integer',
            },
          };
        }

        return filter;
      })
      .filter(Boolean) as Filters.Filter[];
  }, [
    allPermissions,
    model,
    canReadAdminUsers,
    attributes,
    metadata,
    schemas,
    users,
    formatMessage,
  ]);

  const reviewWorkflowFilter = useEnterprise(
    REVIEW_WORKFLOW_FILTER_CE,
    async () =>
      (await import('../../../../../../ee/admin/src/content-manager/pages/ListView/constants'))
        .REVIEW_WORKFLOW_FILTERS,
    {
      combine(ceFilters, eeFilters) {
        return [
          ...ceFilters,
          ...eeFilters
            .filter((eeFilter) => {
              // do not display the filter at all, if the current user does
              // not have permissions to read admin users
              if (eeFilter.name === 'strapi_assignee') {
                return canReadAdminUsers;
              }
              return true;
            })
            .map((eeFilter) => ({
              ...eeFilter,
              'aria-label': formatMessage(eeFilter.label),
              options:
                // TODO: strapi_assignee should not be in here and rather defined
                // in the ee directory.
                eeFilter.name === 'strapi_assignee'
                  ? users.map((user) => ({
                      label: getDisplayName(user, formatMessage),
                      value: user.id.toString(),
                    }))
                  : undefined,
            })),
        ];
      },
      defaultValue: [],
      // we have to wait for admin users to be fully loaded, because otherwise
      // combine is called to early and does not contain the latest state of
      // the users array
      enabled: !!options?.reviewWorkflows && !isLoadingAdminUsers,
    }
    /**
     * this is cast because the data returns MessageDescriptor
     * as `metadatas.label` _then_ we turn it to a string.
     */
  ) as Filters.Filter[];

  const onOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      trackUsage('willFilterEntries');
    }
  };

  const displayedFilters = [...displayedAttributeFilters, ...reviewWorkflowFilter].sort((a, b) =>
    formatter.compare(a.label, b.label)
  );

  const handleFilterChange: Filters.Props['onChange'] = (data) => {
    const attribute = attributes[data.name];

    if (attribute) {
      trackUsage('didFilterEntries', {
        useRelation: attribute.type === 'relation',
      });
    }
  };

  return (
    <Filters.Root
      disabled={disabled}
      options={displayedFilters}
      onOpenChange={onOpenChange}
      onChange={handleFilterChange}
    >
      <Filters.Trigger />
      <Filters.Popover />
      <Filters.List />
    </Filters.Root>
  );
};

/* -------------------------------------------------------------------------------------------------
 * AdminUsersFilter
 * -----------------------------------------------------------------------------------------------*/

const AdminUsersFilter = ({ name }: Filters.ValueInputProps) => {
  const [page, setPage] = React.useState(1);
  const { formatMessage } = useIntl();
  const { data, isLoading } = useAdminUsers({
    page,
  });
  const field = useField(name);

  const handleOpenChange = (isOpen?: boolean) => {
    if (!isOpen) {
      setPage(1);
    }
  };

  const users = data?.users || [];

  return (
    <Combobox
      value={field.value}
      aria-label={formatMessage({
        id: 'content-manager.components.Filters.usersSelect.label',
        defaultMessage: 'Search and select a user to filter',
      })}
      onOpenChange={handleOpenChange}
      onChange={(value) => field.onChange(name, value)}
      loading={isLoading}
      onLoadMore={() => setPage((prev) => prev + 1)}
    >
      {users.map((user) => {
        return (
          <ComboboxOption key={user.id} value={user.id.toString()}>
            {getDisplayName(user, formatMessage)}
          </ComboboxOption>
        );
      })}
    </Combobox>
  );
};

export { FiltersImpl as Filters };
export type { FiltersProps };
