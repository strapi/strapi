import * as React from 'react';

import * as Toolbar from '@radix-ui/react-toolbar';
<<<<<<< HEAD
import {
  Icon,
  Tooltip,
  Select,
  Option,
  Popover,
  Field,
  FieldLabel,
  FieldInput,
  Flex,
  Box,
  Typography,
} from '@strapi/design-system';
=======
import { Icon, Tooltip, Select, Option, Flex } from '@strapi/design-system';
>>>>>>> 7209a381b8 (fixs on the link button)
import { pxToRem, prefixFileUrlWithBackendUrl, useLibrary } from '@strapi/helper-plugin';
import { BulletList, NumberList, Link } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Editor, Transforms, Element as SlateElement, Range } from 'slate';
import { ReactEditor, useSlate } from 'slate-react';
import styled from 'styled-components';

import { useBlocksStore } from '../hooks/useBlocksStore';
import { useModifiersStore } from '../hooks/useModifiersStore';
import { insertLink } from '../utils/links';

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

const ToolbarButton = React.forwardRef(
  ({ icon, name, label, isActive, handleClick, disabled }, ref) => {
    const { formatMessage } = useIntl();
    const labelMessage = formatMessage(label);

    return (
      <Tooltip description={labelMessage}>
        <Toolbar.ToggleItem value={name} data-state={isActive ? 'on' : 'off'} asChild>
          <FlexButton
            ref={ref}
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
            disabled={disabled}
          >
            <Icon width={3} height={3} as={icon} color={isActive ? 'primary600' : 'neutral600'} />
          </FlexButton>
        </Toolbar.ToggleItem>
      </Tooltip>
    );
  }
);

ToolbarButton.defaultProps = {
  disabled: false,
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
  disabled: PropTypes.bool,
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

const isBlockActive = (editor, matchNode) => {
  const { selection } = editor;

  if (!selection) return false;

  const match = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && matchNode(n),
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

const ALLOWED_MEDIA_TYPE = 'images';

const IMAGE_SCHEMA_FIELDS = [
  'name',
  'alternativeText',
  'url',
  'caption',
  'width',
  'height',
  'formats',
  'hash',
  'ext',
  'mime',
  'size',
  'previewUrl',
  'provider',
  'provider_metadata',
  'createdAt',
  'updatedAt',
];

const pick = (object, imageSchemaFields) => {
  return Object.keys(object).reduce((acc, key) => {
    if (imageSchemaFields.includes(key)) {
      acc[key] = object[key];
    }

    return acc;
  }, {});
};

const ImageDialog = ({ handleClose }) => {
  const editor = useSlate();
  const { components } = useLibrary();
  const MediaLibraryDialog = components['media-library'];

  const insertImages = (images) => {
    images.forEach((img) => {
      const image = { type: 'image', image: img, children: [{ type: 'text', text: '' }] };
      Transforms.insertNodes(editor, image);
    });
  };

  const handleSelectAssets = (images) => {
    const formattedImages = images.map((image) => {
      // create an object with imageSchema defined and exclude unnecessary props coming from media library config
      const expectedImage = pick(image, IMAGE_SCHEMA_FIELDS);

      return {
        ...expectedImage,
        alternativeText: expectedImage.alternativeText || expectedImage.name,
        url: prefixFileUrlWithBackendUrl(image.url),
      };
    });

    insertImages(formattedImages);
    handleClose();
  };

  return (
    <MediaLibraryDialog
      allowedTypes={[ALLOWED_MEDIA_TYPE]}
      onClose={handleClose}
      onSelectAssets={handleSelectAssets}
    />
  );
};

ImageDialog.propTypes = {
  handleClose: PropTypes.func.isRequired,
};

export const BlocksDropdown = () => {
  const editor = useSlate();
  const { formatMessage } = useIntl();
  const [isMediaLibraryVisible, setIsMediaLibraryVisible] = React.useState(false);

  const blocks = useBlocksStore();
  const blockKeysToInclude = Object.entries(blocks).reduce((currentKeys, entry) => {
    const [key, block] = entry;

    return block.isInBlocksSelector ? [...currentKeys, key] : currentKeys;
  }, []);

  const [blockSelected, setBlockSelected] = React.useState(Object.keys(blocks)[0]);

  /**
   * @param {string} optionKey - key of the heading selected
   */
  const selectOption = (optionKey) => {
    toggleBlock(editor, blocks[optionKey].value);

    setBlockSelected(optionKey);

    if (optionKey === 'image') {
      setIsMediaLibraryVisible(true);
    }
  };

  return (
    <>
      <Select
        startIcon={<Icon as={blocks[blockSelected].icon} />}
        onChange={selectOption}
        placeholder={blocks[blockSelected].label}
        value={blockSelected}
        aria-label={formatMessage({
          id: 'components.Blocks.blocks.selectBlock',
          defaultMessage: 'Select a block',
        })}
      >
        {blockKeysToInclude.map((key) => (
          <BlockOption
            key={key}
            value={key}
            label={blocks[key].label}
            icon={blocks[key].icon}
            matchNode={blocks[key].matchNode}
            handleSelection={setBlockSelected}
            blockSelected={blockSelected}
          />
        ))}
      </Select>
      {isMediaLibraryVisible && <ImageDialog handleClose={() => setIsMediaLibraryVisible(false)} />}
    </>
  );
};

const BlockOption = ({ value, icon, label, handleSelection, blockSelected, matchNode }) => {
  const { formatMessage } = useIntl();
  const editor = useSlate();

  const isActive = isBlockActive(editor, matchNode);
  const isSelected = value === blockSelected;

  React.useEffect(() => {
    if (isActive && !isSelected) {
      handleSelection(value);
    }
  }, [handleSelection, isActive, isSelected, value]);

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
  matchNode: PropTypes.func.isRequired,
  handleSelection: PropTypes.func.isRequired,
  blockSelected: PropTypes.string.isRequired,
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

const LinkButton = () => {
  const [linkNode, setLinkNode] = React.useState(null);
  const editor = useSlate();

  const isLinkActive = () => {
    if (!editor.selection) return false;

    const [match] = Array.from(
      Editor.nodes(editor, {
        at: Editor.unhangRange(editor, editor.selection),
        match: (node) =>
          !Editor.isEditor(node) && SlateElement.isElement(node) && node.type === 'link',
      })
    );

    return Boolean(match);
  };

  const isActive = isLinkActive();

  const openLinkPopover = () => {
    // We insert an empty anchor, so we split the DOM to have a element we can use as reference for the popover
    insertLink(editor, { url: '', text: Editor.string(editor, editor.selection) });

    const [parentNode] = Editor.parent(editor, editor.selection);

    setLinkNode(parentNode);
  };

  React.useEffect(() => {
    if (linkNode) {
      const domNode = ReactEditor.toDOMNode(editor, linkNode);
      domNode.click();
    }
  }, [linkNode, editor]);

  const textIsHighlighted = editor.selection && !Range.isCollapsed(editor.selection);

  return (
    <ToolbarButton
      disabled={!textIsHighlighted}
      icon={Link}
      name="link"
      label={{
        id: 'components.Blocks.link',
        defaultMessage: 'Link',
      }}
      isActive={isActive}
      handleClick={openLinkPopover}
    />
  );
};

// TODO: Remove after the RTE Blocks Alpha release
const AlphaTag = styled(Box)`
  background-color: ${({ theme }) => theme.colors.warning100};
  border: ${({ theme }) => `1px solid ${theme.colors.warning200}`};
  border-radius: ${({ theme }) => theme.borderRadius};
  font-size: ${({ theme }) => theme.fontSizes[0]};
  padding: ${({ theme }) => `${2 / 16}rem ${theme.spaces[1]}`};
`;

const BlocksToolbar = () => {
  const modifiers = useModifiersStore();

  return (
    <Toolbar.Root asChild>
      {/* Remove after the RTE Blocks Alpha release (paddingRight and width) */}
      <Flex gap={1} padding={2} paddingRight={4} width="100%">
        <BlocksDropdown />
        <Separator />
        <Toolbar.ToggleGroup type="multiple" asChild>
          <Flex gap={1}>
            {Object.entries(modifiers).map(([name, modifier]) => (
              <ToolbarButton
                key={name}
                name={name}
                icon={modifier.icon}
                label={modifier.label}
                isActive={modifier.checkIsActive()}
                handleClick={modifier.handleToggle}
              />
            ))}
            <LinkButton />
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
        {/* TODO: Remove after the RTE Blocks Alpha release */}
        <Flex grow={1} justifyContent="flex-end">
          <AlphaTag>
            <Typography textColor="warning600" variant="sigma">
              ALPHA
            </Typography>
          </AlphaTag>
        </Flex>
      </Flex>
    </Toolbar.Root>
  );
};

export { BlocksToolbar };
