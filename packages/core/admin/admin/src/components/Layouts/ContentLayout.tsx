import * as React from 'react';

import { Box } from '@strapi/design-system';

interface ContentLayoutProps {
  children: React.ReactNode;
}

const ContentLayout = ({ children }: ContentLayoutProps) => {
  return (
    <Box
      paddingLeft={{
        initial: 4,
        medium: 6,
        large: 10,
      }}
      paddingRight={{
        initial: 4,
        medium: 6,
        large: 10,
      }}
    >
      {children}
    </Box>
  );
};

export { ContentLayout, type ContentLayoutProps };
