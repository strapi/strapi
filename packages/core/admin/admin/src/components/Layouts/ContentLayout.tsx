import * as React from 'react';

import { Box } from '@strapi/design-system';

interface ContentLayoutProps {
  children: React.ReactNode;
}

const ContentLayout = ({ children }: ContentLayoutProps) => {
  return (
    <Box paddingLeft={10} paddingRight={10}>
      {children}
    </Box>
  );
};

export { ContentLayout, type ContentLayoutProps };
