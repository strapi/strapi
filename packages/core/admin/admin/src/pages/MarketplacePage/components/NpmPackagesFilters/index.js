import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useQueryParams } from '@strapi/helper-plugin';
import { Box } from '@strapi/design-system/Box';
import { Button } from '@strapi/design-system/Button';
import Filter from '@strapi/icons/Filter';
import FiltersPopover from './FiltersPopover';

const NpmPackagesFilters = ({ possibleCollections, possibleCategories, npmPackageType }) => {
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
            possibleCollections={possibleCollections}
            possibleCategories={possibleCategories}
            npmPackageType={npmPackageType}
          />
        )}
      </Box>
      {/* <FilterListURLQuery filtersSchema={displayedFilters} /> */}
    </>
  );
};

NpmPackagesFilters.propTypes = {
  npmPackageType: PropTypes.oneOf(['plugin', 'provider']).isRequired,
  possibleCollections: PropTypes.object.isRequired,
  possibleCategories: PropTypes.object.isRequired,
};

export default NpmPackagesFilters;
