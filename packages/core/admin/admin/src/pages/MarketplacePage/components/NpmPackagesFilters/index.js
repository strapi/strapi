import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Box, Button, Tag } from '@strapi/design-system';
import { Cross, Filter } from '@strapi/icons';
import FiltersPopover from './FiltersPopover';

const FilterTag = ({ name, handleRemove }) => {
  return (
    <Box padding={1}>
      <Tag icon={<Cross />} onClick={handleRemove}>
        {name}
      </Tag>
    </Box>
  );
};

const ButtonToggle = styled(Button)`
  height: ${({ theme }) => theme.sizes.input.S};
`;

const NpmPackagesFilters = ({
  possibleCollections,
  possibleCategories,
  npmPackageType,
  query,
  handleSelectClear,
  handleSelectChange,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const buttonRef = useRef();
  const { formatMessage } = useIntl();

  const handleToggle = () => setIsVisible((prev) => !prev);

  const handleTagRemove = (tagToRemove, filterType) => {
    const update = {
      [filterType]: query[filterType].filter((previousTag) => previousTag !== tagToRemove),
    };

    handleSelectChange(update);
  };

  return (
    <>
      <Box paddingTop={1} paddingBottom={1}>
        <ButtonToggle
          variant="tertiary"
          ref={buttonRef}
          data-testid="filters-button"
          startIcon={<Filter />}
          onClick={handleToggle}
          size="S"
        >
          {formatMessage({ id: 'app.utils.filters', defaultMessage: 'Filters' })}
        </ButtonToggle>
        {isVisible && (
          <FiltersPopover
            onToggle={handleToggle}
            source={buttonRef}
            query={query}
            handleSelectClear={handleSelectClear}
            handleSelectChange={handleSelectChange}
            possibleCollections={possibleCollections}
            possibleCategories={possibleCategories}
            npmPackageType={npmPackageType}
          />
        )}
      </Box>
      {query.collections?.map((collection) => (
        <FilterTag
          name={collection}
          key={collection}
          handleRemove={() => handleTagRemove(collection, 'collections')}
        />
      ))}
      {npmPackageType === 'plugin' &&
        query.categories?.map((category) => (
          <FilterTag
            name={category}
            key={category}
            handleRemove={() => handleTagRemove(category, 'categories')}
          />
        ))}
    </>
  );
};

FilterTag.propTypes = {
  name: PropTypes.string.isRequired,
  handleRemove: PropTypes.func.isRequired,
};

NpmPackagesFilters.propTypes = {
  npmPackageType: PropTypes.oneOf(['plugin', 'provider']).isRequired,
  possibleCollections: PropTypes.object.isRequired,
  possibleCategories: PropTypes.object.isRequired,
  query: PropTypes.object.isRequired,
  handleSelectChange: PropTypes.func.isRequired,
  handleSelectClear: PropTypes.func.isRequired,
};

export default NpmPackagesFilters;
