import React from 'react';
import PropTypes from 'prop-types';
import { Box, Stack, Grid, GridItem, Typography } from '@strapi/design-system';

export const ContextInfo = ({ blocks }) => {
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
        {blocks.map(({ label, value }) => (
          <GridItem col={6} xs={12} key={label}>
            <Stack spacing={1}>
              <Typography variant="sigma" textColor="neutral600">
                {label}
              </Typography>
              <Typography variant="pi" textColor="neutral700">
                {value}
              </Typography>
            </Stack>
          </GridItem>
        ))}
      </Grid>
    </Box>
  );
};

ContextInfo.propTypes = {
  blocks: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })
  ).isRequired,
};
