import * as React from 'react';

import { Flex, Typography } from '@strapi/design-system';

interface ReadOnlyRowProps {
  label: string;
  children: React.ReactNode;
}

/** One setting that is shown and cannot be changed here: its name, and its value beside it */
const ReadOnlyRow = ({ label, children }: ReadOnlyRowProps) => (
  <Flex justifyContent="space-between" alignItems="flex-start" gap={4}>
    <Typography textColor="neutral600">{label}</Typography>
    <Typography textColor="neutral800" textAlign="right">
      {children}
    </Typography>
  </Flex>
);

export { ReadOnlyRow };
