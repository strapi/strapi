import * as React from 'react';

import * as Toolbar from '@radix-ui/react-toolbar';
import { Flex, Icon, Tooltip, Select, Option } from '@strapi/design-system';
import { pxToRem } from '@strapi/helper-plugin';
import {
  Bold,
  Italic,
  Underline,
  StrikeThrough,
  Code,
  AlignLeft,
  HeadingOne,
  HeadingTwo,
  HeadingThree,
  HeadingFour,
  HeadingFive,
  HeadingSix,
} from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Editor, Transforms, Element as SlateElement } from 'slate';
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

const isBlockActive = (editor, type, level = undefined) => {
  const { selection } = editor;

  if (!selection) return false;

  let matchCondition;

  switch (type) {
    case 'paragraph':
      matchCondition = (n) => n.type === type;
      break;
    case 'heading':
      matchCondition = (n) => n.type === type && n.level === level;
      break;
    default:
      matchCondition = (n) => n.type === type;
      break;
  }

  const match = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && matchCondition(n),
    })
  );

  return match.length > 0;
};

const toggleBlock = (editor, format, blockType = 'paragraph', level = undefined) => {
  Transforms.unwrapNodes(editor, {
    match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n),
    split: true,
  });

  let newProperties = {
    type: blockType,
    level: level || undefined,
  };

  Transforms.setNodes(editor, newProperties);
};

const BlocksDropdown = () => {
  const editor = useSlate();

  const [optionSelected, setOptionSelected] = React.useState(Object.keys(blockItems)[0]);

  /**
   * @param {string} optionKey - key of the heading selected
   */
  const selectOption = (optionKey) => {
    toggleBlock(
      editor,
      blockItems[optionKey].name,
      blockItems[optionKey].value.type,
      blockItems[optionKey].value.level
    );

    setOptionSelected(optionKey);
  };

  return (
    <Select onChange={selectOption} placeholder="Select" value={optionSelected}>
      {Object.keys(blockItems).map((key) => (
        <BlockOption
          key={blockItems[key].name}
          value={key}
          label={blockItems[key].label}
          icon={blockItems[key].icon}
          onActive={setOptionSelected}
        />
      ))}
    </Select>
  );
};

const BlockOption = ({ value, icon, label, onActive }) => {
  const { formatMessage } = useIntl();
  const editor = useSlate();

  const isActive = isBlockActive(
    editor,
    blockItems[value].value.type,
    blockItems[value].value.level
  );

  if (isActive) {
    onActive(value);
  }

  return (
    <Option value={value}>
      <Icon as={icon} width={4} height={4} /> {formatMessage(label)}
    </Option>
  );
};

BlockOption.propTypes = {
  icon: PropTypes.elementType.isRequired,
  value: PropTypes.string.isRequired,
  label: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
  }).isRequired,
  onActive: PropTypes.func.isRequired,
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

const blockItems = {
  text: {
    name: 'text',
    icon: AlignLeft,
    label: { id: 'components.Blocks.blockItems.text', defaultMessage: 'Text' },
    value: {
      type: 'paragraph',
    },
  },
  heading1: {
    name: 'heading-one',
    icon: HeadingOne,
    label: { id: 'components.Blocks.blockItems.heading1', defaultMessage: 'Heading 1' },
    value: {
      type: 'heading',
      level: 1,
    },
  },
  heading2: {
    name: 'heading-two',
    icon: HeadingTwo,
    label: { id: 'components.Blocks.blockItems.heading2', defaultMessage: 'Heading 2' },
    value: {
      type: 'heading',
      level: 2,
    },
  },
  heading3: {
    name: 'heading-three',
    icon: HeadingThree,
    label: { id: 'components.Blocks.blockItems.heading3', defaultMessage: 'Heading 3' },
    value: {
      type: 'heading',
      level: 3,
    },
  },
  heading4: {
    name: 'heading-four',
    icon: HeadingFour,
    label: { id: 'components.Blocks.blockItems.heading4', defaultMessage: 'Heading 4' },
    value: {
      type: 'heading',
      level: 4,
    },
  },
  heading5: {
    name: 'heading-five',
    icon: HeadingFive,
    label: { id: 'components.Blocks.blockItems.heading5', defaultMessage: 'Heading 5' },
    value: {
      type: 'heading',
      level: 5,
    },
  },
  heading6: {
    name: 'heading-six',
    icon: HeadingSix,
    label: { id: 'components.Blocks.blockItems.heading6', defaultMessage: 'Heading 6' },
    value: {
      type: 'heading',
      level: 6,
    },
  },
};

const BlocksToolbar = () => {
  return (
    <Toolbar.Root asChild>
      <Flex gap={1} padding={2}>
        <BlocksDropdown />
        <Separator />
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
