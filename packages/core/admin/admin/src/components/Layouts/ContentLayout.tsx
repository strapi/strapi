import * as React from 'react';

import { Box } from '@strapi/design-system';

import { RESPONSIVE_DEFAULT_SPACING } from '../../constants/theme';

interface ContentLayoutProps {
  children: React.ReactNode;
}

const ContentLayout = ({ children }: ContentLayoutProps) => {
  return (
    <Box
      paddingLeft={RESPONSIVE_DEFAULT_SPACING}
      paddingRight={RESPONSIVE_DEFAULT_SPACING}
      paddingTop={{ initial: 4, medium: 0 }}
    >
      {children}
    </Box>
  );
};

export { ContentLayout, type ContentLayoutProps };
