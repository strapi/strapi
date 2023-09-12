import * as React from 'react';

import * as Toolbar from '@radix-ui/react-toolbar';
import { Flex, Icon, Tooltip } from '@strapi/design-system';
import { pxToRem } from '@strapi/helper-plugin';
import {
  Bold,
  Italic,
  Underline,
  StrikeThrough,
  Code,
  BulletList,
  NumberList,
} from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Editor, Element, Transforms } from 'slate';
import { useSlate } from 'slate-react';
import styled from 'styled-components';

const Separator = styled(Toolbar.Separator)`
  background: ${({ theme }) => theme.colors.neutral150};
  width: 1px;
  height: ${pxToRem(24)};
`;

const FlexButton = styled(Flex).attrs({ as: 'button' })`
  &:hover {
    background: ${({ theme }) => theme.colors.primary100};
  }
`;

const ToolbarButton = ({ icon, name, label, isActive, handleClick }) => {
  const { formatMessage } = useIntl();
  const labelMessage = formatMessage(label);

  return (
    <Tooltip description={labelMessage}>
      <Toolbar.ToggleItem value={name} data-state={isActive ? 'on' : 'off'} asChild>
        <FlexButton
          background={isActive ? 'primary100' : ''}
          alignItems="center"
          justifyContent="center"
          width={7}
          height={7}
          hasRadius
          onMouseDown={(e) => {
            e.preventDefault();
            handleClick();
          }}
          aria-label={labelMessage}
        >
          <Icon width={3} height={3} as={icon} color={isActive ? 'primary600' : 'neutral600'} />
        </FlexButton>
      </Toolbar.ToggleItem>
    </Tooltip>
  );
};

ToolbarButton.propTypes = {
  icon: PropTypes.elementType.isRequired,
  name: PropTypes.string.isRequired,
  label: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
  }).isRequired,
  isActive: PropTypes.bool.isRequired,
  handleClick: PropTypes.func.isRequired,
};

const ModifierButton = ({ icon, name, label }) => {
  const editor = useSlate();

  const isModifierActive = () => {
    const modifiers = Editor.marks(editor);

    if (!modifiers) return false;

    return Boolean(modifiers[name]);
  };

  const isActive = isModifierActive(name);

  const toggleModifier = () => {
    if (isActive) {
      Editor.removeMark(editor, name);
    } else {
      Editor.addMark(editor, name, true);
    }
  };

  return (
    <ToolbarButton
      icon={icon}
      name={name}
      label={label}
      isActive={isActive}
      handleClick={() => toggleModifier(name)}
    />
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
  {
    name: 'code',
    icon: Code,
    label: { id: 'components.Blocks.modifiers.code', defaultMessage: 'Code' },
  },
];

const ListButton = ({ icon, format, label }) => {
  const editor = useSlate();

  const isListActive = () => {
    const { selection } = editor;

    if (!selection) return false;

    const [match] = Array.from(
      Editor.nodes(editor, {
        at: Editor.unhangRange(editor, selection),
        match: (node) =>
          !Editor.isEditor(node) &&
          Element.isElement(node) &&
          node.type === 'list' &&
          node.format === format,
      })
    );

    return Boolean(match);
  };

  const isActive = isListActive();

  const toggleList = () => {
    Transforms.unwrapNodes(editor, {
      match: (node) =>
        !Editor.isEditor(node) &&
        Element.isElement(node) &&
        node.type === 'list' &&
        ['ordered', 'unordered'].includes(node.format),
      split: true,
    });

    Transforms.setNodes(editor, {
      type: isActive ? 'paragraph' : 'list-item',
    });

    if (!isActive) {
      const block = { type: 'list', format, children: [] };
      Transforms.wrapNodes(editor, block);
    }
  };

  return (
    <ToolbarButton
      icon={icon}
      name={format}
      label={label}
      isActive={isActive}
      handleClick={() => toggleList(name)}
    />
  );
};

ListButton.propTypes = {
  icon: PropTypes.elementType.isRequired,
  format: PropTypes.string.isRequired,
  label: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
  }).isRequired,
};

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
        <Toolbar.ToggleGroup type="single" asChild>
          <Flex gap={1}>
            <ListButton
              label={{
                id: 'components.Blocks.blocks.unorderedList',
                defaultMessage: 'Unordered list',
              }}
              format="unordered"
              icon={BulletList}
            />
            <ListButton
              label={{
                id: 'components.Blocks.blocks.orderedList',
                defaultMessage: 'Ordered list',
              }}
              format="ordered"
              icon={NumberList}
            />
          </Flex>
        </Toolbar.ToggleGroup>
      </Flex>
    </Toolbar.Root>
  );
};

export { BlocksToolbar };
