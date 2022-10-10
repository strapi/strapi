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
  npmPackageType,
  possibleCategories,
  possibleCollections,
}) => {
  const { formatMessage } = useIntl();

  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <Popover source={source} padding={3} spacing={4} onBlur={() => {}}>
      <FocusTrap onEscape={onToggle}>
        <form onSubmit={handleSubmit}>
          <Stack spacing={1}>
            <Box>
              <FilterSelect
                message={formatMessage({
                  id: 'admin.pages.MarketPlacePage.filters.collections',
                  defaultMessage: 'Collections',
                })}
                value={query?.collections || []}
                onChange={(newCollections) => setQuery({ collections: newCollections })}
                onClear={() => setQuery({ collections: [] }, 'remove')}
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
                  onChange={(newCategories) => setQuery({ categories: newCategories })}
                  onClear={() => setQuery({ categories: [] }, 'remove')}
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
        </form>
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
};

export default FiltersPopover;
