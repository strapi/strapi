import React from 'react';

import { Box, Grid, SingleSelectOption, SingleSelect, Field } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { pageSizes, sortOptions } from '../../../../constants';
import getTrad from '../../../../utils/getTrad';

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
      <Grid.Root gap={4}>
        <Grid.Item s={12} col={6} direction="column" alignItems="stretch">
          <Field.Root
            hint={formatMessage({
              id: getTrad('config.entries.note'),
              defaultMessage: 'Number of assets displayed by default in the Media Library',
            })}
            name="pageSize"
          >
            <Field.Label>
              {formatMessage({
                id: getTrad('config.entries.title'),
                defaultMessage: 'Entries per page',
              })}
            </Field.Label>
            <SingleSelect
              onChange={(value) => onChange({ target: { name: 'pageSize', value } })}
              value={pageSize}
            >
              {pageSizes.map((pageSize) => (
                <SingleSelectOption key={pageSize} value={pageSize}>
                  {pageSize}
                </SingleSelectOption>
              ))}
            </SingleSelect>
            <Field.Hint />
          </Field.Root>
        </Grid.Item>
        <Grid.Item s={12} col={6} direction="column" alignItems="stretch">
          <Field.Root
            hint={formatMessage({
              id: getTrad('config.note'),
              defaultMessage: 'Note: You can override this value in the media library.',
            })}
            name="sort"
          >
            <Field.Label>
              {formatMessage({
                id: getTrad('config.sort.title'),
                defaultMessage: 'Default sort order',
              })}
            </Field.Label>
            <SingleSelect
              onChange={(value) => onChange({ target: { name: 'sort', value } })}
              value={sort}
              test-sort={sort}
              data-testid="sort-select"
            >
              {sortOptions.map((filter) => (
                <SingleSelectOption
                  data-testid={`sort-option-${filter.value}`}
                  key={filter.key}
                  value={filter.value}
                >
                  {formatMessage({ id: getTrad(filter.key), defaultMessage: `${filter.value}` })}
                </SingleSelectOption>
              ))}
            </SingleSelect>
            <Field.Hint />
          </Field.Root>
        </Grid.Item>
      </Grid.Root>
    </Box>
  );
};

Settings.propTypes = {
  sort: PropTypes.string.isRequired,
  pageSize: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
};

export { Settings };
