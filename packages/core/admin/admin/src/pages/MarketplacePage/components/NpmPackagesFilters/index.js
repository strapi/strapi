import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Box } from '@strapi/design-system/Box';
import { Button } from '@strapi/design-system/Button';
import { Tag } from '@strapi/design-system/Tag';
import Cross from '@strapi/icons/Cross';
import Filter from '@strapi/icons/Filter';
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

const NpmPackagesFilters = ({
  possibleCollections,
  possibleCategories,
  npmPackageType,
  query,
  setQuery,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const buttonRef = useRef();
  const { formatMessage } = useIntl();

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
      {query.collections?.map((collection) => (
        <FilterTag
          name={collection}
          key={collection}
          handleRemove={() =>
            setQuery({
              collections: query.collections.filter(
                (previousCollection) => previousCollection !== collection
              ),
            })
          }
        />
      ))}
      {npmPackageType === 'plugin' &&
        query.categories?.map((category) => (
          <FilterTag
            name={category}
            key={category}
            handleRemove={() =>
              setQuery({
                categories: query.categories.filter(
                  (previousCategory) => previousCategory !== category
                ),
              })
            }
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
  setQuery: PropTypes.func.isRequired,
};

export default NpmPackagesFilters;
