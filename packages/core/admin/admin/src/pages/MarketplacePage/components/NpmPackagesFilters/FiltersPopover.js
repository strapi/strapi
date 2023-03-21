import React from 'react';
import PropTypes from 'prop-types';
import { Box, Popover, Flex, FocusTrap } from '@strapi/design-system';
import { useIntl } from 'react-intl';
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
    <Popover source={source} padding={3} spacing={4} onBlur={() => {}}>
      <FocusTrap onEscape={onToggle}>
        <Flex direction="column" alignItems="stretch" gap={1}>
          <Box>
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
            </Box>
          )}
        </Flex>
      </FocusTrap>
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
