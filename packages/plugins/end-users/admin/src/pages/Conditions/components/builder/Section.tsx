import * as React from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

/** One section of the builder page: a titled box, which assistive technology reads as a region */
export const Section = ({ title, description, children }: SectionProps) => {
  const headingId = React.useId();

  return (
    <Box
      tag="section"
      aria-labelledby={headingId}
      background="neutral0"
      padding={6}
      shadow="filterShadow"
      hasRadius
    >
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Flex direction="column" alignItems="stretch" gap={1}>
          <Typography id={headingId} variant="delta" tag="h2">
            {title}
          </Typography>
          {description && <Typography textColor="neutral600">{description}</Typography>}
        </Flex>
        {children}
      </Flex>
    </Box>
  );
};
