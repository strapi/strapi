import * as React from 'react';

import * as Toolbar from '@radix-ui/react-toolbar';
import { Flex, Icon, Tooltip } from '@strapi/design-system';
import { pxToRem } from '@strapi/helper-plugin';
import { Bold, Italic, Underline, StrikeThrough } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Editor } from 'slate';
import { useSlate } from 'slate-react';
import styled from 'styled-components';

const Separator = styled(Toolbar.Separator)`
  background: ${({ theme }) => theme.colors.neutral150};
  width: 1px;
  height: ${pxToRem(24)};
`;

const ModifierButton = ({ icon, name, label }) => {
  const editor = useSlate();

  /**
   * @param {string} name - name of the modifier
   */
  const isModifierActive = (name) => {
    const modifiers = Editor.marks(editor);

    return modifiers ? modifiers[name] === true : false;
  };

  /**
   * @param {string} name - name of the modifier
   */
  const toggleModifier = (name) => {
    const isActive = isModifierActive(name);

    if (isActive) {
      Editor.removeMark(editor, name);
    } else {
      Editor.addMark(editor, name, true);
    }
  };
  const isActive = isModifierActive(name);

  const { formatMessage } = useIntl();
  const labelMessage = formatMessage(label);

  return (
    <Tooltip description={labelMessage}>
      <Toolbar.ToggleItem value={name} data-state={isActive ? 'on' : 'off'} asChild>
        <Flex
          background={isActive ? 'primary100' : ''}
          padding={2}
          as="button"
          hasRadius
          onMouseDown={(e) => {
            e.preventDefault();
            toggleModifier(name);
          }}
          aria-label={labelMessage}
        >
          <Icon width={4} as={icon} color={isActive ? 'primary600' : 'neutral600'} />
        </Flex>
      </Toolbar.ToggleItem>
    </Tooltip>
  );
};

ModifierButton.propTypes = {
  icon: PropTypes.elementType.isRequired,
  name: PropTypes.string.isRequired,
  label: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
  }).isRequired,
};

// TODO: extract a store of modifiers that rules both the toolbar and the leaf renderers
const modifiers = [
  {
    name: 'bold',
    icon: Bold,
    label: { id: 'components.Blocks.modifiers.bold', defaultMessage: 'Bold' },
  },
  {
    name: 'italic',
    icon: Italic,
    label: { id: 'components.Blocks.modifiers.italic', defaultMessage: 'Italic' },
  },
  {
    name: 'underline',
    icon: Underline,
    label: { id: 'components.Blocks.modifiers.underline', defaultMessage: 'Underline' },
  },
  {
    name: 'strikethrough',
    icon: StrikeThrough,
    label: { id: 'components.Blocks.modifiers.strikethrough', defaultMessage: 'Strikethrough' },
  },
];

const BlocksToolbar = () => {
  return (
    <Toolbar.Root asChild>
      <Flex gap={1} padding={2}>
        <Toolbar.ToggleGroup type="multiple" asChild>
          <Flex gap={1}>
            {modifiers.map((modifier) => (
              <ModifierButton
                key={modifier.name}
                label={modifier.label}
                name={modifier.name}
                icon={modifier.icon}
              />
            ))}
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
