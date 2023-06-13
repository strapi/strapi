import React from 'react';

import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useQueryParams, getDisplayName } from '@strapi/helper-plugin';
import { useAdminUsers } from '../../../hooks/useAdminUsers';
import useAllowedAttributes from './hooks/useAllowedAttributes';
import Filters from './Filters';
import { AdminUsersFilter } from './AdminUsersFilter';

const AUTHOR_ATTRIBUTES = ['createdBy', 'updatedBy'];

const AttributeFilter = ({ contentType, slug, metadatas }) => {
  const { formatMessage } = useIntl();

  const [{ query }] = useQueryParams();
  // We get the users selected' ids
  const selectedUsers =
    query?.filters?.$and?.reduce((acc, filter) => {
      const [key, value] = Object.entries(filter)[0];
      const id = value.id?.$eq || value.id?.$ne;

      if (AUTHOR_ATTRIBUTES.includes(key) && !acc.includes(id)) {
        acc.push(id);
      }

      return acc;
    }, []) ?? [];
  const { users, isLoading } = useAdminUsers(
    { filter: { id: { in: selectedUsers } } },
    {
      enabled: selectedUsers.length > 0,
    }
  );

  const allowedAttributes = useAllowedAttributes(contentType, slug);
  const displayedFilters = allowedAttributes.map((name) => {
    if (AUTHOR_ATTRIBUTES.includes(name)) {
      return {
        name,
        metadatas: {
          label: formatMessage({
            id: `content-manager.components.Filters.${name}`,
            defaultMessage: name,
          }),
          customOperators: [
            {
              intlLabel: { id: 'components.FilterOptions.FILTER_TYPES.$eq', defaultMessage: 'is' },
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
        },
        fieldSchema: {
          type: 'relation',
          mainField: { name: 'id' },
          trackedEvent: {
            name: 'didFilterEntries',
            properties: { useRelation: true },
          },
        },
      };
    }

    const attribute = contentType.attributes[name];
    const { type, enum: options } = attribute;

    const trackedEvent = {
      name: 'didFilterEntries',
      properties: { useRelation: type === 'relation' },
    };

    const { mainField, label } = metadatas[name].list;

    return {
      name,
      metadatas: { label: formatMessage({ id: label, defaultMessage: label }) },
      fieldSchema: { type, options, mainField },
      trackedEvent,
    };
  });

  if (isLoading) {
    return null;
  }

  return <Filters displayedFilters={displayedFilters} />;
};

AttributeFilter.propTypes = {
  contentType: PropTypes.object.isRequired,
  metadatas: PropTypes.object.isRequired,
  slug: PropTypes.string.isRequired,
};

export default AttributeFilter;
