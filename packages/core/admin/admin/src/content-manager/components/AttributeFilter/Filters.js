import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Box } from '@strapi/design-system/Box';
import { Button } from '@strapi/design-system/Button';
import Filter from '@strapi/icons/Filter';
import { FilterListURLQuery, FilterPopoverURLQuery, useTracking } from '@strapi/helper-plugin';

const Filters = ({ displayedFilters }) => {
  const [isVisible, setIsVisible] = useState(false);
  const { formatMessage } = useIntl();
  const buttonRef = useRef();
  const { trackUsage } = useTracking();

  const handleBlur = e => {
    // TO FIX - select's modals prevent blur to work correctly
    const notNull = e.currentTarget !== null && e.relatedTarget !== null;
    const ulListBox = document.querySelector('[role="listbox"]');
    const selectDate = document.querySelector('[role="dialog"]');

    if (
      !e.currentTarget.contains(e.relatedTarget) &&
      e.relatedTarget !== buttonRef.current &&
      e.relatedTarget !== ulListBox &&
      !selectDate.contains(e.relatedTarget) &&
      notNull
    ) {
      setIsVisible(false);
    }
  };

  const handleToggle = () => {
    if (!isVisible) {
      trackUsage('willFilterEntries');
    }
    setIsVisible(prev => !prev);
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
        {isVisible && (
          <FilterPopoverURLQuery
            displayedFilters={displayedFilters}
            isVisible={isVisible}
            onBlur={handleBlur}
            onToggle={handleToggle}
            source={buttonRef}
          />
        )}
      </Box>
      <FilterListURLQuery filtersSchema={displayedFilters} />
    </>
  );
};

Filters.propTypes = {
  displayedFilters: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      metadatas: PropTypes.shape({ label: PropTypes.string }),
      fieldSchema: PropTypes.shape({ type: PropTypes.string }),
    })
  ).isRequired,
};

export default Filters;
