import * as React from 'react';

import { Flex } from '@strapi/design-system';
import { styled } from 'styled-components';

import { RESPONSIVE_DEFAULT_SPACING } from '../../constants/theme';

/** On mobile: first item stays left, rest stick to the right (margin-right: auto on first child). */
const EndActionsFlex = styled(Flex)`
  width: 100%;
  & > *:first-child {
    margin-right: auto;
  }

  ${({ theme }) => theme.breakpoints.medium} {
    width: auto;
    & > *:first-child {
      margin-right: 0;
    }
  }
`;

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
      direction={{ initial: 'column', medium: 'row' }}
      gap={{ initial: 4, medium: 3 }}
      alignItems="flex-start"
      paddingBottom={{ initial: 2, medium: 4 }}
      paddingTop={0}
      paddingLeft={RESPONSIVE_DEFAULT_SPACING}
      paddingRight={RESPONSIVE_DEFAULT_SPACING}
      wrap={{ initial: 'nowrap', medium: 'wrap' }}
    >
      <Flex gap={2} wrap="wrap" flex={1} width="100%">
        {startActions}
      </Flex>
      <EndActionsFlex gap={{ initial: 3, medium: 2 }} shrink={0} wrap="wrap">
        {endActions}
      </EndActionsFlex>
      {bottomActions && (
        <Flex gap={2} wrap="wrap" width="100%">
          {bottomActions}
        </Flex>
      )}
    </Flex>
  );
};

export { ActionLayout, type ActionLayoutProps };
