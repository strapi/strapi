import React from 'react';

import { Box, Grid, KeyboardNavigable, Typography } from '@strapi/design-system';
import PropTypes from 'prop-types';

export const FolderGridList = ({ title, children }) => {
  return (
    <KeyboardNavigable tagName="article">
      {title && (
        <Box paddingBottom={2}>
          <Typography tag="h2" variant="delta" fontWeight="semiBold">
            {title}
          </Typography>
        </Box>
      )}

      <Grid.Root gap={4}>{children}</Grid.Root>
    </KeyboardNavigable>
  );
};

FolderGridList.defaultProps = {
  title: null,
};

FolderGridList.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
};
