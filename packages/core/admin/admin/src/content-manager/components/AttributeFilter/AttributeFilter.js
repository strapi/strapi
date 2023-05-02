import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { FilterListURLQuery, FilterPopoverURLQuery, useTracking } from '@strapi/helper-plugin';
import { Box, Button } from '@strapi/design-system';
import { Filter } from '@strapi/icons';

import { useAllowedAttributes } from './hooks/useAllowedAttributes';

export function AttributeFilter({ layout, slug }) {
  const { contentType } = layout;
  const { metadatas } = contentType;

  const { formatMessage } = useIntl();
  const [isVisible, setIsVisible] = useState(false);
  const buttonRef = useRef();
  const { trackUsage } = useTracking();
  const allowedAttributes = useAllowedAttributes(contentType, slug);
  const displayedFilters = allowedAttributes.sort().map((name) => {
    const { type, enum: options } = contentType.attributes[name];
    const { mainField, label } = metadatas[name].list;

    return {
      name,
      metadatas: { label },
      fieldSchema: { type, options, mainField },
      trackedEvent: {
        name: 'didFilterEntries',
        properties: { useRelation: type === 'relation' },
      },
    };
  });

  const handleToggle = () => {
    if (!isVisible) {
      trackUsage('willFilterEntries');
    }

    setIsVisible((prev) => !prev);
  };

  return (
    <>
      <Box paddingTop={1} paddingBottom={1}>
        <Button
          variant="tertiary"
          ref={buttonRef}
          startIcon={<Filter />}
          onClick={handleToggle}
          size="S"
        >
          {formatMessage({ id: 'app.utils.filters', defaultMessage: 'Filters' })}
        </Button>

        <FilterPopoverURLQuery
          displayedFilters={displayedFilters}
          isVisible={isVisible}
          onToggle={handleToggle}
          source={buttonRef}
        />
      </Box>

      <FilterListURLQuery filtersSchema={displayedFilters} />
    </>
  );
}

AttributeFilter.propTypes = {
  layout: PropTypes.shape({
    contentType: PropTypes.shape({
      attributes: PropTypes.object,
      metadatas: PropTypes.object,
    }),
  }).isRequired,
  slug: PropTypes.string.isRequired,
};
