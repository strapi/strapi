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
  BulletList,
  NumberList,
  Paragraph,
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

  const isActive = isModifierActive();

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
      handleClick={toggleModifier}
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

const isBlockActive = (editor, value) => {
  const { selection } = editor;

  if (!selection) return false;

  let matchCondition;

  switch (value.type) {
    case 'heading':
      matchCondition = (n) => n.type === value.type && n.level === value?.level;
      break;
    default:
      matchCondition = (n) => n.type === value.type;
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

const toggleBlock = (editor, value) => {
  const { type, level } = value;

  const newProperties = {
    type,
    level: level || null,
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
    toggleBlock(editor, blockItems[optionKey].value);

    setOptionSelected(optionKey);
  };

  return (
    <Select
      startIcon={<Icon as={blockItems[optionSelected].icon} />}
      onChange={selectOption}
      placeholder={blockItems[optionSelected].label}
      value={optionSelected}
    >
      {Object.keys(blockItems).map((key) => (
        <BlockOption
          key={blockItems[key].name}
          value={key}
          label={blockItems[key].label}
          icon={blockItems[key].icon}
          onActive={setOptionSelected}
          optionSelected={optionSelected}
        />
      ))}
    </Select>
  );
};

const BlockOption = ({ value, icon, label, onActive, optionSelected }) => {
  const { formatMessage } = useIntl();
  const editor = useSlate();

  const isActive = isBlockActive(editor, blockItems[value].value);
  const isSelected = value === optionSelected;

  if (isActive && !isSelected) {
    onActive(value);
  }

  return (
    <Option
      startIcon={<Icon as={icon} color={isSelected ? 'primary600' : 'neutral600'} />}
      value={value}
    >
      {formatMessage(label)}
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
  optionSelected: PropTypes.string.isRequired,
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
    icon: Paragraph,
    label: { id: 'components.Blocks.blocks.text', defaultMessage: 'Text' },
    value: {
      type: 'paragraph',
    },
  },
  heading1: {
    name: 'heading-one',
    icon: HeadingOne,
    label: { id: 'components.Blocks.blocks.heading1', defaultMessage: 'Heading 1' },
    value: {
      type: 'heading',
      level: 1,
    },
  },
  heading2: {
    name: 'heading-two',
    icon: HeadingTwo,
    label: { id: 'components.Blocks.blocks.heading2', defaultMessage: 'Heading 2' },
    value: {
      type: 'heading',
      level: 2,
    },
  },
  heading3: {
    name: 'heading-three',
    icon: HeadingThree,
    label: { id: 'components.Blocks.blocks.heading3', defaultMessage: 'Heading 3' },
    value: {
      type: 'heading',
      level: 3,
    },
  },
  heading4: {
    name: 'heading-four',
    icon: HeadingFour,
    label: { id: 'components.Blocks.blocks.heading4', defaultMessage: 'Heading 4' },
    value: {
      type: 'heading',
      level: 4,
    },
  },
  heading5: {
    name: 'heading-five',
    icon: HeadingFive,
    label: { id: 'components.Blocks.blocks.heading5', defaultMessage: 'Heading 5' },
    value: {
      type: 'heading',
      level: 5,
    },
  },
  heading6: {
    name: 'heading-six',
    icon: HeadingSix,
    label: { id: 'components.Blocks.blocks.heading6', defaultMessage: 'Heading 6' },
    value: {
      type: 'heading',
      level: 6,
    },
  },
};

const ListButton = ({ icon, format, label }) => {
  const editor = useSlate();

  /**
   *
   * @param {import('slate').Node} node
   * @returns boolean
   */
  const isListNode = (node) => {
    return !Editor.isEditor(node) && SlateElement.isElement(node) && node.type === 'list';
  };

  const isListActive = () => {
    const { selection } = editor;

    if (!selection) return false;

    const [match] = Array.from(
      Editor.nodes(editor, {
        at: Editor.unhangRange(editor, selection),
        match: (node) => isListNode(node) && node.format === format,
      })
    );

    return Boolean(match);
  };

  const isActive = isListActive();

  const toggleList = () => {
    // Delete the parent list so that we're left with only the list items directly
    Transforms.unwrapNodes(editor, {
      match: (node) => isListNode(node) && ['ordered', 'unordered'].includes(node.format),
      split: true,
    });

    // Change the type of the current selection
    Transforms.setNodes(editor, {
      type: isActive ? 'paragraph' : 'list-item',
    });

    // If the selection is now a list item, wrap it inside a list
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
      handleClick={toggleList}
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
