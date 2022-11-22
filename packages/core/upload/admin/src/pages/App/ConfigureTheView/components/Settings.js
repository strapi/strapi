import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Box } from '@strapi/design-system/Box';
import { Select, Option } from '@strapi/design-system/Select';
import getTrad from '../../../../utils/getTrad';
import { pageSizes, sortOptions } from '../../../../constants';

const Settings = ({ sort = '', pageSize = 10, onChange }) => {
  const { formatMessage } = useIntl();

  return (
    <Box
      background="neutral0"
      hasRadius
      shadow="tableShadow"
      paddingTop={6}
      paddingBottom={6}
      paddingLeft={7}
      paddingRight={7}
    >
      <Grid gap={4}>
        <GridItem s={12} col={6}>
          <Select
            label={formatMessage({
              id: getTrad('config.entries.title'),
              defaultMessage: 'Entries per page',
            })}
            hint={formatMessage({
              id: getTrad('config.entries.note'),
              defaultMessage: 'Number of assets displayed by default in the Media Library',
            })}
            onChange={(value) => onChange({ target: { name: 'pageSize', value } })}
            name="pageSize"
            value={pageSize}
            test-pageSize={pageSize}
            data-testid="pageSize-select"
          >
            {pageSizes.map((pageSize) => (
              <Option data-testid={`pageSize-option-${pageSize}`} key={pageSize} value={pageSize}>
                {pageSize}
              </Option>
            ))}
          </Select>
        </GridItem>
        <GridItem s={12} col={6}>
          <Select
            label={formatMessage({
              id: getTrad('config.sort.title'),
              defaultMessage: 'Default sort order',
            })}
            hint={formatMessage({
              id: getTrad('config.note'),
              defaultMessage: 'Note: You can override this value in the media library.',
            })}
            onChange={(value) => onChange({ target: { name: 'sort', value } })}
            name="sort"
            value={sort}
            test-sort={sort}
            data-testid="sort-select"
          >
            {sortOptions.map((filter) => (
              <Option
                data-testid={`sort-option-${filter.value}`}
                key={filter.key}
                value={filter.value}
              >
                {formatMessage({ id: getTrad(filter.key), defaultMessage: `${filter.value}` })}
              </Option>
            ))}
          </Select>
        </GridItem>
      </Grid>
    </Box>
  );
};

Settings.propTypes = {
  sort: PropTypes.string.isRequired,
  pageSize: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
};

export { Settings };
