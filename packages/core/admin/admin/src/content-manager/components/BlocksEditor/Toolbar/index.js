import * as React from 'react';

import * as Toolbar from '@radix-ui/react-toolbar';
import { Flex, Icon } from '@strapi/design-system';
import { pxToRem } from '@strapi/helper-plugin';
import { Bold, Italic, Underline, StrikeThrough } from '@strapi/icons';
import PropTypes from 'prop-types';
import styled from 'styled-components';

const Separator = styled(Toolbar.Separator)`
  background: ${({ theme }) => theme.colors.neutral150};
  width: 1px;
  height: ${pxToRem(24)};
`;

const Modifier = ({ isOn, icon }) => {
  return (
    <Toolbar.ToggleItem value="test" data-state={isOn ? 'on' : 'off'} asChild>
      <Flex background={isOn ? 'primary100' : ''} padding={2} as="button" hasRadius>
        <Icon width={4} as={icon} color={isOn ? 'primary600' : 'neutral600'} />
      </Flex>
    </Toolbar.ToggleItem>
  );
};

Modifier.propTypes = {
  icon: PropTypes.elementType.isRequired,
  isOn: PropTypes.bool.isRequired,
};

const BlocksToolbar = () => {
  return (
    <Toolbar.Root asChild>
      <Flex gap={1} padding={2}>
        <Toolbar.ToggleGroup type="multiple" asChild>
          <Flex gap={1}>
            <Modifier isOn icon={Bold} />
            <Modifier isOn={false} icon={Italic} />
            <Modifier isOn={false} icon={Underline} />
            <Modifier isOn={false} icon={StrikeThrough} />
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
