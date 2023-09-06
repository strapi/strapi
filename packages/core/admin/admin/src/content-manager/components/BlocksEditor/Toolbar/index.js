import * as React from 'react';

import * as Toolbar from '@radix-ui/react-toolbar';
import { Flex } from '@strapi/design-system';
import { pxToRem } from '@strapi/helper-plugin';
import styled from 'styled-components';

const Separator = styled(Toolbar.Separator)`
  background: ${({ theme }) => theme.colors.neutral150};
  width: 1px;
  height: ${pxToRem(24)};
`;

const BlocksToolbar = () => {
  return (
    <Toolbar.Root asChild>
      <Flex gap={1} padding={2}>
        <Toolbar.ToggleGroup type="multiple" asChild>
          <Flex gap={1}>
            <Toolbar.ToggleItem value="test">test</Toolbar.ToggleItem>
            <Toolbar.ToggleItem value="test2">test</Toolbar.ToggleItem>
          </Flex>
        </Toolbar.ToggleGroup>
        <Separator />
        <Toolbar.ToggleGroup type="multiple" asChild>
          <Flex gap={1}>
            <Toolbar.ToggleItem value="test">test</Toolbar.ToggleItem>
            <Toolbar.ToggleItem value="test2">test</Toolbar.ToggleItem>
          </Flex>
        </Toolbar.ToggleGroup>
      </Flex>
    </Toolbar.Root>
  );
};

export { BlocksToolbar };
