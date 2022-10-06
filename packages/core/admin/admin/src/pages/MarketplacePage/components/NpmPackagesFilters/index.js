import React, { useState, useRef } from 'react';
import { useIntl } from 'react-intl';
import { useQueryParams } from '@strapi/helper-plugin';
import { Box } from '@strapi/design-system/Box';
import { Button } from '@strapi/design-system/Button';
import Filter from '@strapi/icons/Filter';
import FiltersPopover from './FiltersPopover';

const NpmPackagesFilters = () => {
  const [isVisible, setIsVisible] = useState(false);
  const buttonRef = useRef();
  const { formatMessage } = useIntl();
  const [{ query }, setQuery] = useQueryParams();

  const handleToggle = () => setIsVisible((prev) => !prev);

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
          <FiltersPopover
            onToggle={handleToggle}
            source={buttonRef}
            query={query}
            setQuery={setQuery}
          />
        )}
      </Box>
      {/* <FilterListURLQuery filtersSchema={displayedFilters} /> */}
    </>
  );
};

export default NpmPackagesFilters;
