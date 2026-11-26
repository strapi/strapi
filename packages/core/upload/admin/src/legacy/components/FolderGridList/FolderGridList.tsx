import * as React from 'react';

import { Box, Grid, KeyboardNavigable, Typography } from '@strapi/design-system';

export interface FolderGridListProps {
  children: React.ReactNode;
  title?: string | null;
}

export const FolderGridList = ({ title = null, children }: FolderGridListProps) => {
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
