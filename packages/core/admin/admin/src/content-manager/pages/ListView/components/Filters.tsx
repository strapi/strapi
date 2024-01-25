import * as React from 'react';

import { Button } from '@strapi/design-system';
import {
  FilterData,
  FilterListURLQuery,
  FilterPopoverURLQuery,
  findMatchingPermissions,
  useCollator,
  useQueryParams,
  useRBACProvider,
  useTracking,
} from '@strapi/helper-plugin';
import { Filter as FilterIcon } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useEnterprise } from '../../../../hooks/useEnterprise';
import { useAdminUsers } from '../../../../services/users';
import { CREATOR_FIELDS } from '../../../constants/attributes';
import { Schema } from '../../../hooks/useDocument';
import { useGetContentTypeConfigurationQuery } from '../../../services/contentTypes';
import { getDisplayName } from '../../../utils/users';

import { AdminUsersFilter } from './AdminUsersFilter';

const REVIEW_WORKFLOW_FILTER_CE: FilterData[] = [];

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

interface FiltersProps {
  disabled?: boolean;
  schema: Schema;
}

const Filters = ({ disabled, schema }: FiltersProps) => {
  const { attributes, uid: model, options } = schema;
  const [isVisible, setIsVisible] = React.useState(false);
  const { formatMessage, locale } = useIntl();
  const buttonRef = React.useRef<HTMLButtonElement>(null!);
  const { trackUsage } = useTracking();
  const { allPermissions } = useRBACProvider();
  const [{ query }] = useQueryParams<{
    filters?: {
      $and: Array<{
        [key: string]: {
          id?: {
            $eq?: string;
            $ne?: string;
          };
        };
      }>;
    };
  }>();

  const canReadAdminUsers = React.useMemo(
    () =>
      findMatchingPermissions(allPermissions, [
        {
          action: 'admin::users.read',
          subject: null,
        },
      ]).length > 0,
    [allPermissions]
  );

  const selectedUserIds =
    query?.filters?.$and?.reduce<string[]>((acc, filter) => {
      const [key, value] = Object.entries(filter)[0];
      const id = value.id?.$eq || value.id?.$ne;
      // TODO: strapi_assignee should not be in here and rather defined
      // in the ee directory.
      if (id && USER_FILTER_ATTRIBUTES.includes(key) && !acc.includes(id)) {
        acc.push(id);
      }
      return acc;
    }, []) ?? [];

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
    const [{ properties: { fields = [] } = { fields: [] } }] = findMatchingPermissions(
      allPermissions,
      [
        {
          action: 'plugin::content-manager.explorer.read',
          subject: model,
        },
      ]
    );

    const allowedFields = fields.filter((attr) => {
      const attribute = attributes[attr] ?? {};

      return attribute.type && !NOT_ALLOWED_FILTERS.includes(attribute.type);
    });

    return [
      'id',
      ...allowedFields,
      ...DEFAULT_ALLOWED_FILTERS,
      ...(canReadAdminUsers ? CREATOR_FIELDS : []),
    ].map((name) => {
      const attribute = attributes[name];
      const trackedEvent = {
        name: 'didFilterEntries',
        properties: { useRelation: attribute.type === 'relation' },
      } as const;
      const { mainField = '', label } = metadata[name].list;

      const actualMainField = {
        name: mainField,
        schema: attributes[mainField],
      };

      const filter: FilterData = {
        name,
        metadatas: { label: formatMessage({ id: label, defaultMessage: label }) },
        fieldSchema: {
          type: attribute.type,
          options: 'enum' in attribute ? attribute.enum : [],
          mainField: actualMainField,
        },
        trackedEvent,
      };

      if (
        attribute.type === 'relation' &&
        'target' in attribute &&
        attribute.target === 'admin::user'
      ) {
        filter.metadatas = {
          ...filter.metadatas,
          customOperators: [
            {
              intlLabel: {
                id: 'components.FilterOptions.FILTER_TYPES.$eq',
                defaultMessage: 'is',
              },
              value: '$eq',
            },
            {
              intlLabel: {
                id: 'components.FilterOptions.FILTER_TYPES.$ne',
                defaultMessage: 'is not',
              },
              value: '$ne',
            },
          ],
          customInput: AdminUsersFilter,
          options: users.map((user) => ({
            label: getDisplayName(user, formatMessage),
            customValue: user.id.toString(),
          })),
        };
        filter.fieldSchema.mainField = {
          ...actualMainField,
          name: 'id',
        };
      }

      return filter;
    });
  }, [allPermissions, model, canReadAdminUsers, attributes, metadata, formatMessage, users]);

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
                return (
                  findMatchingPermissions(allPermissions, [
                    {
                      action: 'admin::users.read',
                      subject: null,
                    },
                  ]).length > 0
                );
              }
              return true;
            })
            .map((eeFilter) => ({
              ...eeFilter,
              metadatas: {
                ...eeFilter.metadatas,
                // the stage filter needs the current content-type uid to fetch
                // the list of stages that can be assigned to this content-type
                ...(eeFilter.name === 'strapi_stage' ? { uid: model } : {}),
                // translate the filter label
                label: formatMessage(eeFilter.metadatas.label),
                // `options` allows the filter-tag to render the displayname
                // of a user over a plain id
                options:
                  eeFilter.name === 'strapi_assignee'
                    ? users.map((user) => ({
                        label: getDisplayName(user, formatMessage),
                        customValue: user.id.toString(),
                      }))
                    : undefined,
              },
            })),
        ];
      },
      defaultValue: [],
      // we have to wait for admin users to be fully loaded, because otherwise
      // combine is called to early and does not contain the latest state of
      // the users array
      enabled: options?.reviewWorkflows && !isLoadingAdminUsers,
    }
    /**
     * this is cast because the data returns MessageDescriptor
     * as `metadatas.label` _then_ we turn it to a string.
     */
  ) as FilterData[];

  const handleToggle = () => {
    if (!isVisible) {
      trackUsage('willFilterEntries');
    }
    setIsVisible((prev) => !prev);
  };

  const displayedFilters = [...displayedAttributeFilters, ...reviewWorkflowFilter].sort((a, b) =>
    formatter.compare(a.metadatas.label, b.metadatas.label)
  );

  return (
    <>
      <Button
        variant="tertiary"
        ref={buttonRef}
        startIcon={<FilterIcon />}
        onClick={handleToggle}
        size="S"
        disabled={disabled}
      >
        {formatMessage({ id: 'app.utils.filters', defaultMessage: 'Filters' })}
      </Button>
      {isVisible && (
        <FilterPopoverURLQuery
          displayedFilters={displayedFilters}
          isVisible={isVisible}
          onToggle={handleToggle}
          source={buttonRef}
        />
      )}
      <FilterListURLQuery filtersSchema={displayedFilters} />
    </>
  );
};

export { Filters };
export type { FiltersProps };
