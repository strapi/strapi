import * as React from 'react';

import * as Toolbar from '@radix-ui/react-toolbar';
import { Flex, Icon } from '@strapi/design-system';
import { pxToRem } from '@strapi/helper-plugin';
import { Bold, Italic, Underline, StrikeThrough } from '@strapi/icons';
import PropTypes from 'prop-types';
import { Editor } from 'slate';
import { useSlate } from 'slate-react';
import styled from 'styled-components';

const Separator = styled(Toolbar.Separator)`
  background: ${({ theme }) => theme.colors.neutral150};
  width: 1px;
  height: ${pxToRem(24)};
`;

/**
 *
 * @param {import('slate').BaseEditor} editor
 * @param {string} name - name of the modifier
 */
const isModifierActive = (editor, name) => {
  const modifiers = Editor.marks(editor);

  return modifiers ? modifiers[name] === true : false;
};

/**
 *
 * @param {import('slate').BaseEditor} editor
 * @param {string} name - name of the modifier
 */
const toggleModifier = (editor, name) => {
  const isActive = isModifierActive(editor, name);

  if (isActive) {
    Editor.removeMark(editor, name);
  } else {
    Editor.addMark(editor, name, true);
  }
};

const ModifierButton = ({ icon, name }) => {
  const editor = useSlate();
  const isActive = isModifierActive(editor, name);

  return (
    <Toolbar.ToggleItem value="test" data-state={isActive ? 'on' : 'off'} asChild>
      <Flex
        background={isActive ? 'primary100' : ''}
        padding={2}
        as="button"
        hasRadius
        onClick={() => {
          toggleModifier(editor, name);
        }}
      >
        <Icon width={4} as={icon} color={isActive ? 'primary600' : 'neutral600'} />
      </Flex>
    </Toolbar.ToggleItem>
  );
};

ModifierButton.propTypes = {
  icon: PropTypes.elementType.isRequired,
  name: PropTypes.string.isRequired,
};

const BlocksToolbar = () => {
  return (
    <Toolbar.Root asChild>
      <Flex gap={1} padding={2}>
        <Toolbar.ToggleGroup type="multiple" asChild>
          <Flex gap={1}>
            <ModifierButton name="bold" icon={Bold} />
            <ModifierButton name="italic" icon={Italic} />
            <ModifierButton name="underline" icon={Underline} />
            <ModifierButton name="strikethrough" icon={StrikeThrough} />
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
