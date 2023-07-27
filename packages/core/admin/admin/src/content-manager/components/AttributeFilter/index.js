import React from 'react';

import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import Filters from './Filters';
import useAllowedAttributes from './hooks/useAllowedAttributes';

const AttributeFilter = ({ contentType, slug, metadatas }) => {
  const { formatMessage } = useIntl();
  const allowedAttributes = useAllowedAttributes(contentType, slug);
  const displayedFilters = allowedAttributes.map((name) => {
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
