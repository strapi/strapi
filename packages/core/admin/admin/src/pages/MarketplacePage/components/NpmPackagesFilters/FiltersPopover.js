import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system/Box';
import { Popover } from '@strapi/design-system/Popover';
import { Stack } from '@strapi/design-system/Stack';
import { FocusTrap } from '@strapi/design-system/FocusTrap';
import { useIntl } from 'react-intl';
import FilterSelect from './FilterSelect';

const FiltersPopover = ({
  source,
  onToggle,
  query,
  setQuery,
  setTabQuery,
  npmPackageType,
  possibleCategories,
  possibleCollections,
}) => {
  const { formatMessage } = useIntl();

  const handleFilterChange = (update) => {
    setQuery(update);
    setTabQuery((prev) => ({
      ...prev,
      [npmPackageType]: { ...prev[npmPackageType], ...update },
    }));
  };

  const handleFilterClear = (filterType) => {
    setQuery({ [filterType]: [] }, 'remove');
    setTabQuery((prev) => ({ ...prev, [npmPackageType]: {} }));
  };

  return (
    <Popover source={source} padding={3} spacing={4} onBlur={() => {}}>
      <FocusTrap onEscape={onToggle}>
        <Stack spacing={1}>
          <Box>
            <FilterSelect
              message={formatMessage({
                id: 'admin.pages.MarketPlacePage.filters.collections',
                defaultMessage: 'Collections',
              })}
              value={query?.collections || []}
              onChange={(newCollections) => {
                const update = { collections: newCollections };
                handleFilterChange(update);
              }}
              onClear={() => handleFilterClear('collections')}
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
          </Box>
          {npmPackageType === 'plugin' && (
            <Box>
              <FilterSelect
                message={formatMessage({
                  id: 'admin.pages.MarketPlacePage.filters.categories',
                  defaultMessage: 'Categories',
                })}
                value={query?.categories || []}
                onChange={(newCategories) => {
                  const update = { categories: newCategories };
                  handleFilterChange(update);
                }}
                onClear={() => handleFilterClear('categories')}
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
            </Box>
          )}
        </Stack>
      </FocusTrap>
    </Popover>
  );
};

FiltersPopover.propTypes = {
  onToggle: PropTypes.func.isRequired,
  source: PropTypes.shape({ current: PropTypes.instanceOf(Element) }).isRequired,
  query: PropTypes.object.isRequired,
  setQuery: PropTypes.func.isRequired,
  npmPackageType: PropTypes.oneOf(['plugin', 'provider']).isRequired,
  possibleCollections: PropTypes.object.isRequired,
  possibleCategories: PropTypes.object.isRequired,
  setTabQuery: PropTypes.func.isRequired,
};

export default FiltersPopover;
