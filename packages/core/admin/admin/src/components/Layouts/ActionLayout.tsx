import * as React from 'react';

import { Flex } from '@strapi/design-system';

interface ActionLayoutProps {
  endActions?: React.ReactNode;
  startActions?: React.ReactNode;
}

const ActionLayout = ({ startActions, endActions }: ActionLayoutProps) => {
  if (!startActions && !endActions) {
    return null;
  }

  return (
    <Flex
      justifyContent="space-between"
      alignItems="flex-start"
      paddingBottom={4}
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
      <Flex gap={2} wrap="wrap">
        {startActions}
      </Flex>

      <Flex gap={2} shrink={0} wrap="wrap">
        {endActions}
      </Flex>
    </Flex>
  );
};

export { ActionLayout, type ActionLayoutProps };
