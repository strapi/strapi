import * as React from 'react';

import { Flex } from '@strapi/design-system';

import { RESPONSIVE_DEFAULT_SPACING } from '../../constants/theme';
import { useIsMobile } from '../../hooks/useMediaQuery';

interface ActionLayoutProps {
  endActions?: React.ReactNode;
  startActions?: React.ReactNode;
  bottomActions?: React.ReactNode;
}

const ActionLayout = ({ startActions, endActions, bottomActions }: ActionLayoutProps) => {
  const isMobile = useIsMobile();

  if (!startActions && !endActions) {
    return null;
  }

  return isMobile ? (
    <Flex
      gap={3}
      direction="column"
      paddingBottom={2}
      paddingTop={4}
      paddingLeft={RESPONSIVE_DEFAULT_SPACING}
      paddingRight={RESPONSIVE_DEFAULT_SPACING}
      alignItems="center"
    >
      <Flex gap={2} wrap="wrap" width="100%">
        {startActions}
        {endActions}
      </Flex>
      {bottomActions && (
        <Flex gap={2} wrap="wrap" width="100%">
          {bottomActions}
        </Flex>
      )}
    </Flex>
  ) : (
    <Flex
      justifyContent="space-between"
      alignItems="flex-start"
      paddingBottom={{ initial: 2, medium: 4 }}
      paddingTop={{ initial: 4, medium: 0 }}
      paddingLeft={RESPONSIVE_DEFAULT_SPACING}
      paddingRight={RESPONSIVE_DEFAULT_SPACING}
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
