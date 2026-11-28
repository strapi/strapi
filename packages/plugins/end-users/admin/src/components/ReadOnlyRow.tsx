import * as React from 'react';

import { Grid, Typography } from '@strapi/design-system';

interface ReadOnlyRowProps {
  label: string;
  children: React.ReactNode;
}

/**
 * The settings that are shown and cannot be changed here, as the admin's Overview shows its
 * details: a grid of items, each a label over its value, so a value is read next to its label.
 */
const ReadOnlyList = ({ children }: { children: React.ReactNode }) => (
  <Grid.Root gap={5} tag="dl">
    {children}
  </Grid.Root>
);

/** One setting of a `ReadOnlyList`: its name, and its value under it */
const ReadOnlyRow = ({ label, children }: ReadOnlyRowProps) => (
  <Grid.Item col={4} s={6} xs={12} direction="column" alignItems="start">
    <Typography variant="sigma" textColor="neutral600" tag="dt">
      {label}
    </Typography>
    <Typography textColor="neutral800" tag="dd">
      {children}
    </Typography>
  </Grid.Item>
);

export { ReadOnlyList, ReadOnlyRow };
