import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Box } from '@strapi/design-system/Box';
import { Typography } from '@strapi/design-system/Typography';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Select, Option } from '@strapi/design-system/Select';

import getTrad from '../../../../utils/getTrad';

const Settings = ({ pageSize = '', onChange }) => {
  const { formatMessage } = useIntl();

  return (
    <>
      <Box paddingBottom={4}>
        <Typography variant="delta" as="h2">
          {formatMessage({
            id: getTrad('FIXME'),
            defaultMessage: 'Settings',
          })}
        </Typography>
      </Box>
      <Grid gap={4}>
        <GridItem s={12} col={6}>
          <Select
            label={formatMessage({
              id: getTrad('FIXME'),
              defaultMessage: 'Entries per page',
            })}
            hint={formatMessage({
              id: getTrad('FIXME'),
              defaultMessage: 'Note: You can override this value in the media library.',
            })}
            onChange={(value) => onChange({ target: { name: 'pageSize', value } })}
            name="pageSize"
            value={pageSize}
          >
            {[10, 20, 50, 100].map((pageSize) => (
              <Option key={pageSize} value={pageSize}>
                {pageSize}
              </Option>
            ))}
          </Select>
        </GridItem>
      </Grid>
    </>
  );
};

Settings.propTypes = {
  pageSize: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default memo(Settings);
