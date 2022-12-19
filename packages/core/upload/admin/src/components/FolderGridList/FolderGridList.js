import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@strapi/design-system/Box';
import { KeyboardNavigable } from '@strapi/design-system/KeyboardNavigable';
import { Grid } from '@strapi/design-system/Grid';
import { Typography } from '@strapi/design-system/Typography';

export const FolderGridList = ({ title, children }) => {
  return (
    <KeyboardNavigable tagName="article">
      {title && (
        <Box paddingBottom={2}>
          <Typography as="h2" variant="delta" fontWeight="semiBold">
            {title}
          </Typography>
        </Box>
      )}

      <Grid gap={4}>{children}</Grid>
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
