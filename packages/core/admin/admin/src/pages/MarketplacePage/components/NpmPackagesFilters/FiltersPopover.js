import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system/Box';
import { Popover } from '@strapi/design-system/Popover';
import { Stack } from '@strapi/design-system/Stack';
import { FocusTrap } from '@strapi/design-system/FocusTrap';
import { useIntl } from 'react-intl';
import FilterSelect from './FilterSelect';

const possibleFilters = {
  collections: {
    'Made by Strapi': 20,
    Verified: 4,
  },
  categories: {
    'Custom fields': 20,
    Deployment: 4,
  },
};

const FiltersPopover = ({ source, onToggle, query, setQuery }) => {
  const { formatMessage } = useIntl();

  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <Popover source={source} padding={3} spacing={4} onBlur={() => {}}>
      <FocusTrap onEscape={onToggle}>
        <form onSubmit={handleSubmit}>
          <Stack spacing={1} style={{ minWidth: 184 }}>
            <Box>
              <FilterSelect
                message={formatMessage({
                  id: 'admin.pages.MarketPlacePage.filters.collections',
                  defaultMessage: 'Collections',
                })}
                value={query?.collections || []}
                onChange={(newCollections) => setQuery({ collections: newCollections })}
                onClear={() => setQuery({ collections: [] }, 'remove')}
                possibleFilters={possibleFilters.collections}
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
            <Box>
              <FilterSelect
                message={formatMessage({
                  id: 'admin.pages.MarketPlacePage.filters.categories',
                  defaultMessage: 'Categories',
                })}
                value={query?.categories || []}
                onChange={(newCategories) => setQuery({ categories: newCategories })}
                onClear={() => setQuery({ categories: [] }, 'remove')}
                possibleFilters={possibleFilters.categories}
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
              />
            </Box>
          </Stack>
        </form>
      </FocusTrap>
    </Popover>
  );
};

FiltersPopover.defaultProps = {
  query: {},
};

FiltersPopover.propTypes = {
  onToggle: PropTypes.func.isRequired,
  source: PropTypes.shape({ current: PropTypes.instanceOf(Element) }).isRequired,
  query: PropTypes.shape({
    collections: PropTypes.arrayOf(PropTypes.string),
    categories: PropTypes.arrayOf(PropTypes.string),
  }),
  setQuery: PropTypes.func.isRequired,
};

export default FiltersPopover;
