import * as React from 'react';

import {
  Filters,
  useField,
  useAuth,
  useTracking,
  useQueryParams,
  useAdminUsers,
} from '@strapi/admin/strapi-admin';
import { Combobox, ComboboxOption, useCollator } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { CREATOR_FIELDS } from '../../../constants/attributes';
import { useContentTypeSchema } from '../../../hooks/useContentTypeSchema';
import { useDebounce } from '../../../hooks/useDebounce';
import { Schema } from '../../../hooks/useDocument';
import { useGetContentTypeConfigurationQuery } from '../../../services/contentTypes';
import { getMainField } from '../../../utils/attributes';
import { getDisplayName } from '../../../utils/users';

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

  const displayedFilters = React.useMemo(() => {
    const [{ properties: { fields = [] } = { fields: [] } }] = allPermissions.filter(
      (permission) =>
        permission.action === 'plugin::content-manager.explorer.read' &&
        permission.subject === model
    );

    const allowedFields = fields.filter((field) => {
      const attribute = attributes[field] ?? {};

      return attribute.type && !NOT_ALLOWED_FILTERS.includes(attribute.type);
    });

    return (
      [
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
                label: getDisplayName(user),
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

          if (attribute.type === 'enumeration') {
            filter = {
              ...filter,
              options: attribute.enum.map((value) => ({
                label: value,
                value,
              })),
            };
          }

          return filter;
        })
        .filter(Boolean) as Filters.Filter[]
    ).toSorted((a, b) => formatter.compare(a.label, b.label));
  }, [
    allPermissions,
    canReadAdminUsers,
    model,
    attributes,
    metadata,
    schemas,
    users,
    formatMessage,
    formatter,
  ]);

  const onOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      trackUsage('willFilterEntries');
    }
  };

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
  const [pageSize, setPageSize] = React.useState(10);
  const [search, setSearch] = React.useState('');
  const { formatMessage } = useIntl();

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useAdminUsers({
    pageSize,
    _q: debouncedSearch,
  });
  const field = useField(name);

  const handleOpenChange = (isOpen?: boolean) => {
    if (!isOpen) {
      setPageSize(10);
    }
  };

  const { users = [], pagination } = data ?? {};
  const { pageCount = 1, page = 1 } = pagination ?? {};

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
      onLoadMore={() => setPageSize(pageSize + 10)}
      hasMoreItems={page < pageCount}
      onInputChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.currentTarget.value);
      }}
    >
      {users.map((user) => {
        return (
          <ComboboxOption key={user.id} value={user.id.toString()}>
            {getDisplayName(user)}
          </ComboboxOption>
        );
      })}
    </Combobox>
  );
};

export { FiltersImpl as Filters };
export type { FiltersProps };
