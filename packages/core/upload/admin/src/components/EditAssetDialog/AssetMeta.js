import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Box } from '@strapi/design-system/Box';
import { Stack } from '@strapi/design-system/Stack';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Typography } from '@strapi/design-system/Typography';
import getTrad from '../../utils/getTrad';

export const AssetMeta = ({ size, date, dimension, extension }) => {
  const { formatMessage } = useIntl();

  return (
    <Box
      hasRadius
      paddingLeft={6}
      paddingRight={6}
      paddingTop={4}
      paddingBottom={4}
      background="neutral100"
    >
      <Grid gap={4}>
        <GridItem col={6} xs={12}>
          <Stack spacing={1}>
            <Typography variant="sigma" textColor="neutral600">
              {formatMessage({ id: getTrad('modal.file-details.size'), defaultMessage: 'Size' })}
            </Typography>
            <Typography variant="pi" textColor="neutral700">
              {size}
            </Typography>
          </Stack>
        </GridItem>
        <GridItem col={6} xs={12}>
          <Stack spacing={1}>
            <Typography variant="sigma" textColor="neutral600">
              {formatMessage({ id: getTrad('modal.file-details.date'), defaultMessage: 'Date' })}
            </Typography>
            <Typography variant="pi" textColor="neutral700">
              {date}
            </Typography>
          </Stack>
        </GridItem>
        <GridItem col={6} xs={12}>
          <Stack spacing={1}>
            <Typography variant="sigma" textColor="neutral600">
              {formatMessage({
                id: getTrad('modal.file-details.dimensions'),
                defaultMessage: 'Dimensions',
              })}
            </Typography>
            <Typography variant="pi" textColor="neutral700">
              {dimension}
            </Typography>
          </Stack>
        </GridItem>
        <GridItem col={6} xs={12}>
          <Stack spacing={1}>
            <Typography variant="sigma" textColor="neutral600">
              {formatMessage({
                id: getTrad('modal.file-details.extension'),
                defaultMessage: 'Extension',
              })}
            </Typography>

            <Typography
              textColor="neutral700"
              textTransform="uppercase"
              fontSize={1}
              lineHeight={3}
            >
              {extension}
            </Typography>
          </Stack>
        </GridItem>
      </Grid>
    </Box>
  );
};

AssetMeta.propTypes = {
  size: PropTypes.string.isRequired,
  date: PropTypes.string.isRequired,
  dimension: PropTypes.string.isRequired,
  extension: PropTypes.string.isRequired,
};
