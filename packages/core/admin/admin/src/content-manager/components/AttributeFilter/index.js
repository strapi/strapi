import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useQueryParams, getDisplayName } from '@strapi/helper-plugin';
import { useQueryClient } from 'react-query';

import { useAdminUsers } from '../../../hooks/useAdminUsers';
import useAllowedAttributes from './hooks/useAllowedAttributes';
import Filters from './Filters';
import { AdminUsersFilter } from './AdminUsersFilter';

const customOperators = [
  {
    intlLabel: { id: 'components.FilterOptions.FILTER_TYPES.$eq', defaultMessage: 'is' },
    value: '$eq',
  },
  {
    intlLabel: { id: 'components.FilterOptions.FILTER_TYPES.$ne', defaultMessage: 'is not' },
    value: '$ne',
  },
];

const AUTHOR_ATTRIBUTES = ['createdBy', 'updatedBy'];

const getUsersSelected = (query) => {
  return (
    query?.filters?.$and?.reduce((acc, filter) => {
      const [key, value] = Object.entries(filter)[0];
      const id = value.id?.$eq || value.id?.$ne;

      if (AUTHOR_ATTRIBUTES.includes(key) && !acc.includes(id)) {
        acc.push(id);
      }

      return acc;
    }, []) ?? []
  );
};

const formatUsers = (users, formatMessage) => {
  return users.map((user) => ({
    label: getDisplayName(user, formatMessage),
    customValue: user.id.toString(),
  }));
};

const AttributeFilter = ({ contentType, slug, metadatas }) => {
  const { formatMessage } = useIntl();
  const allowedAttributes = useAllowedAttributes(contentType, slug);
  const queryClient = useQueryClient();
  const [{ query }] = useQueryParams();
  const selectedUsers = getUsersSelected(query);
  const { users, isLoading } = useAdminUsers(
    { filter: { id: { in: selectedUsers } } },
    {
      enabled: selectedUsers.length > 0,
    }
  );

  const displayedFilters = allowedAttributes.map((name) => {
    if (AUTHOR_ATTRIBUTES.includes(name)) {
      return {
        name,
        metadatas: {
          label: formatMessage({
            id: `content-manager.components.Filters.${name}`,
            defaultMessage: name,
          }),
          customOperators,
          customInput: AdminUsersFilter,
          options: formatUsers(
            queryClient.getQueryData(['users', '', {}])?.results ?? users,
            formatMessage
          ),
        },
        fieldSchema: { type: 'relation', mainField: { name: 'id' } },
        trackedEvent: {
          name: 'didFilterEntries',
          properties: { useRelation: true },
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
