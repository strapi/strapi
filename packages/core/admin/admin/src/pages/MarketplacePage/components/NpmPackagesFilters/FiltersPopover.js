import React from 'react';

import { Flex, Popover } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import FilterSelect from './FilterSelect';

const FiltersPopover = ({
  source,
  onToggle,
  query,
  npmPackageType,
  possibleCategories,
  possibleCollections,
  handleSelectChange,
  handleSelectClear,
}) => {
  const { formatMessage } = useIntl();

  return (
    <Popover source={source} onDismiss={onToggle} padding={3} spacing={4}>
      <FiltersFlex direction="column" alignItems="stretch" gap={1}>
        <FilterSelect
          message={formatMessage({
            id: 'admin.pages.MarketPlacePage.filters.collections',
            defaultMessage: 'Collections',
          })}
          value={query?.collections || []}
          onChange={(newCollections) => {
            const update = { collections: newCollections };
            handleSelectChange(update);
          }}
          onClear={() => handleSelectClear('collections')}
          possibleFilters={possibleCollections}
          customizeContent={(values) =>
            formatMessage(
              {
                id: 'admin.pages.MarketPlacePage.filters.collectionsSelected',
                defaultMessage:
                  '{count, plural, =0 {No collections} one {# collection} other {# collections}} selected',
              },
              { count: values.length }
            )
          }
        />
        {npmPackageType === 'plugin' && (
          <FilterSelect
            message={formatMessage({
              id: 'admin.pages.MarketPlacePage.filters.categories',
              defaultMessage: 'Categories',
            })}
            value={query?.categories || []}
            onChange={(newCategories) => {
              const update = { categories: newCategories };
              handleSelectChange(update);
            }}
            onClear={() => handleSelectClear('categories')}
            possibleFilters={possibleCategories}
            customizeContent={(values) =>
              formatMessage(
                {
                  id: 'admin.pages.MarketPlacePage.filters.categoriesSelected',
                  defaultMessage:
                    '{count, plural, =0 {No categories} one {# category} other {# categories}} selected',
                },
                { count: values.length }
              )
            }
            name="categories"
          />
        )}
      </FiltersFlex>
    </Popover>
  );
};

FiltersPopover.propTypes = {
  onToggle: PropTypes.func.isRequired,
  source: PropTypes.shape({ current: PropTypes.instanceOf(Element) }).isRequired,
  query: PropTypes.object.isRequired,
  npmPackageType: PropTypes.oneOf(['plugin', 'provider']).isRequired,
  possibleCollections: PropTypes.object.isRequired,
  possibleCategories: PropTypes.object.isRequired,
  handleSelectChange: PropTypes.func.isRequired,
  handleSelectClear: PropTypes.func.isRequired,
};

export default FiltersPopover;

const FiltersFlex = styled(Flex)`
  /* Hide the label, every input needs a label. */
  label {
    border: 0;
    clip: rect(0 0 0 0);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    width: 1px;
  }
`;
