import * as React from 'react';

import { Box } from '@strapi/design-system';

interface ContentLayoutProps {
  children: React.ReactNode;
}

const ContentLayout = ({ children }: ContentLayoutProps) => {
  return (
    <Box
      paddingLeft={{
        initial: 6,
        small: 8,
        medium: 10,
      }}
      paddingRight={{
        initial: 6,
        small: 8,
        medium: 10,
      }}
    >
      {children}
    </Box>
  );
};

export { ContentLayout, type ContentLayoutProps };
