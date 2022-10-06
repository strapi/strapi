import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system/Box';
import { Popover } from '@strapi/design-system/Popover';
import { Stack } from '@strapi/design-system/Stack';
import { FocusTrap } from '@strapi/design-system/FocusTrap';
import { Select, Option } from '@strapi/design-system/Select';
import { useIntl } from 'react-intl';

const filters = {
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

  const categoriesMessage = formatMessage({
    id: 'admin.pages.MarketPlacePage.filters.collections',
    defaultMessage: 'Collections',
  });

  return (
    <Popover source={source} padding={3} spacing={4} onBlur={() => {}}>
      <FocusTrap onEscape={onToggle}>
        <form onSubmit={handleSubmit}>
          <Stack spacing={1} style={{ minWidth: 184 }}>
            <Box>
              <Select
                aria-label={categoriesMessage}
                placeholder={categoriesMessage}
                name="categories"
                size="M"
                onChange={(newCategories) => setQuery({ categories: newCategories })}
                onClear={() => setQuery({ categories: [] }, 'remove')}
                value={query?.categories || []}
                customizeContent={(values) =>
                  formatMessage(
                    {
                      id: 'admin.pages.MarketPlacePage.filters.collectionsSelected',
                      defaultMessage: 'test',
                    },
                    { count: values.length }
                  )
                }
                multi
              >
                {Object.entries(filters.categories).map(([name, count]) => {
                  return (
                    <Option key={name} value={name}>
                      {name} ({count})
                    </Option>
                  );
                })}
              </Select>
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
