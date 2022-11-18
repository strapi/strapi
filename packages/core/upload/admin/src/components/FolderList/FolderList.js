import React from 'react';
import PropTypes from 'prop-types';
import { Box, KeyboardNavigable, Grid, Typography } from '@strapi/design-system';

export const FolderList = ({ title, children }) => {
  return (
    <KeyboardNavigable tagName="article">
      {title && (
        <Box paddingTop={2} paddingBottom={2}>
          <Typography as="h2" variant="delta" fontWeight="semiBold">
            {title}
          </Typography>
        </Box>
      )}

      <Grid gap={4}>{children}</Grid>
    </KeyboardNavigable>
  );
};

FolderList.defaultProps = {
  title: null,
};

FolderList.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
};
