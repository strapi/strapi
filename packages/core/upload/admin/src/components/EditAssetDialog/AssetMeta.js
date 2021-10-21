import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Box } from '@strapi/parts/Box';
import { Stack } from '@strapi/parts/Stack';
import { Grid, GridItem } from '@strapi/parts/Grid';
import { TableLabel, Text, Typography } from '@strapi/parts/Text';
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
          <Stack size={1}>
            <TableLabel textColor="neutral600">
              {formatMessage({ id: getTrad('modal.file-details.size'), defaultMessage: 'Size' })}
            </TableLabel>
            <Text small textColor="neutral700">
              {size}
            </Text>
          </Stack>
        </GridItem>
        <GridItem col={6} xs={12}>
          <Stack size={1}>
            <TableLabel textColor="neutral600">
              {formatMessage({ id: getTrad('modal.file-details.date'), defaultMessage: 'Date' })}
            </TableLabel>
            <Text small textColor="neutral700">
              {date}
            </Text>
          </Stack>
        </GridItem>
        <GridItem col={6} xs={12}>
          <Stack size={1}>
            <TableLabel textColor="neutral600">
              {formatMessage({
                id: getTrad('modal.file-details.dimensions'),
                defaultMessage: 'Dimensions',
              })}
            </TableLabel>
            <Text small textColor="neutral700">
              {dimension}
            </Text>
          </Stack>
        </GridItem>
        <GridItem col={6} xs={12}>
          <Stack size={1}>
            <TableLabel textColor="neutral600">
              {formatMessage({
                id: getTrad('modal.file-details.extension'),
                defaultMessage: 'Extension',
              })}
            </TableLabel>

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
