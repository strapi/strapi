import * as React from 'react';

import { Flex } from '@strapi/design-system';

import { RESPONSIVE_DEFAULT_SPACING } from '../../constants/theme';

interface ActionLayoutProps {
  endActions?: React.ReactNode;
  startActions?: React.ReactNode;
  bottomActions?: React.ReactNode;
}

const ActionLayout = ({ startActions, endActions, bottomActions }: ActionLayoutProps) => {
  if (!startActions && !endActions) {
    return null;
  }

  return (
    <Flex
      gap={{ initial: 2, medium: 3 }}
      paddingBottom={{ initial: 2, medium: 4 }}
      paddingTop={{ initial: 4, medium: 0 }}
      paddingLeft={RESPONSIVE_DEFAULT_SPACING}
      paddingRight={RESPONSIVE_DEFAULT_SPACING}
      wrap="wrap"
    >
      <Flex gap={2} wrap="wrap" flex={1}>
        {startActions}
      </Flex>
      <Flex gap={2} shrink={0} wrap="wrap">
        {endActions}
      </Flex>
      {bottomActions && (
        <Flex gap={2} wrap="wrap" width="100%">
          {bottomActions}
        </Flex>
      )}
    </Flex>
  );
};

export { ActionLayout, type ActionLayoutProps };
