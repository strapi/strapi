import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import useAllowedAttributes from './hooks/useAllowedAttributes';
import Filters from './Filters';
import AdminUsersFilter from './AdminUsersFilter';

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

const AttributeFilter = ({ contentType, slug, metadatas }) => {
  const { formatMessage } = useIntl();
  const allowedAttributes = useAllowedAttributes(contentType, slug);
  const displayedFilters = allowedAttributes.map((name) => {
    if (name === 'createdBy' || name === 'updatedBy') {
      return {
        name,
        metadatas: {
          label: formatMessage({
            id: `content-manager.components.Filters.${name}`,
            defaultMessage: name,
          }),
          customOperators,
          customInput: AdminUsersFilter,
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

  return <Filters displayedFilters={displayedFilters} />;
};

AttributeFilter.propTypes = {
  contentType: PropTypes.object.isRequired,
  metadatas: PropTypes.object.isRequired,
  slug: PropTypes.string.isRequired,
};

export default AttributeFilter;
