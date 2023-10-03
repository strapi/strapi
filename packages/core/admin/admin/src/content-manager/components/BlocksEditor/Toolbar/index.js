import * as React from 'react';

import * as Toolbar from '@radix-ui/react-toolbar';
import { Flex, Icon, Tooltip, Select, Option, Box, Typography } from '@strapi/design-system';
import { pxToRem, prefixFileUrlWithBackendUrl, useLibrary } from '@strapi/helper-plugin';
import { BulletList, NumberList } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Editor, Transforms, Element as SlateElement } from 'slate';
import { useSlate } from 'slate-react';
import styled from 'styled-components';

import { useBlocksStore } from '../hooks/useBlocksStore';
import { useModifiersStore } from '../hooks/useModifiersStore';

/* -------------------------------------------------------------------------------------------------
 * ToolbarButton
 * -----------------------------------------------------------------------------------------------*/
const FlexButton = styled(Flex).attrs({ as: 'button' })`
  // Inherit the not-allowed cursor from ToolbarWrapper when disabled
  &[aria-disabled] {
    cursor: inherit;
  }

  &[aria-disabled='false'] {
    cursor: pointer;

    // Only apply hover styles if the button is enabled
    &:hover {
      background: ${({ theme }) => theme.colors.primary100};
    }
  }
`;

const ToolbarButton = ({ icon, name, label, isActive, disabled, handleClick }) => {
  const { formatMessage } = useIntl();
  const labelMessage = formatMessage(label);

  const enabledColor = isActive ? 'primary600' : 'neutral600';

  return (
    <Tooltip description={labelMessage}>
      <Toolbar.ToggleItem
        value={name}
        data-state={isActive ? 'on' : 'off'}
        onMouseDown={(e) => {
          e.preventDefault();
          handleClick();
        }}
        aria-disabled={disabled}
        disabled={disabled}
        aria-label={labelMessage}
        asChild
      >
        <FlexButton
          background={isActive ? 'primary100' : ''}
          alignItems="center"
          justifyContent="center"
          width={7}
          height={7}
          hasRadius
        >
          <Icon width={3} height={3} as={icon} color={disabled ? 'neutral300' : enabledColor} />
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
  disabled: PropTypes.bool.isRequired,
  handleClick: PropTypes.func.isRequired,
};

/* -------------------------------------------------------------------------------------------------
 * ImageDialog
 * -----------------------------------------------------------------------------------------------*/
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

/**
 * This function selects from an image object the properties listed in the image schema fields.
 * @param {object} object - represents an image object
 * @param {array<string>} imageSchemaFields - represents the image schema fields
 * @returns {object} - returns an object with the properties listed in the image schema fields
 */
const pick = (object, imageSchemaFields) => {
  return Object.keys(object).reduce((acc, key) => {
    if (imageSchemaFields.includes(key)) {
      acc[key] = object[key];
    }

    return acc;
  }, {});
};

/**
 * This function checks if the current block is the last block of a specific type.
 * @param {import('slate').Editor} editor - the Slate Editor
 * @param {string} type - the type of the block
 * @returns {boolean} - returns true if the current block is the last block of a specific type
 */
const isLastBlockType = (editor, type) => {
  const { selection } = editor;

  if (!selection) return false;

  const [currentBlock] = Editor.nodes(editor, {
    at: selection,
    match: (n) => n.type === type,
  });

  if (currentBlock) {
    const [, currentNodePath] = currentBlock;

    const isNodeAfter = Boolean(Editor.after(editor, currentNodePath));

    return !isNodeAfter;
  }

  return false;
};

/**
 * This function inserts an empty block at the bottom of the editor.
 * @param {import('slate').Editor} editor - the Slate Editor
 */
const insertEmptyBlockAtLast = (editor) => {
  Transforms.insertNodes(
    editor,
    {
      type: 'paragraph',
      children: [{ type: 'text', text: '' }],
    },
    { at: [editor.children.length] }
  );
};

const ImageDialog = ({ handleClose }) => {
  const editor = useSlate();
  const { components } = useLibrary();
  const MediaLibraryDialog = components['media-library'];

  /**
   * This function is able to insert inside the Slate Editor the image selected.
   * @param {array<object>} images - the selected images from the media library
   */
  const insertImages = (images) => {
    images.forEach((img) => {
      const image = { type: 'image', image: img, children: [{ type: 'text', text: '' }] };
      Transforms.insertNodes(editor, image);
    });
  };

  /**
   * Handles the selection of an asset from the media library when you create an image block.
   * @param {array<object>} images - the selected images from the media library
   */
  const handleSelectAssets = (images) => {
    const formattedImages = images.map((image) => {
      // Create an object with imageSchema defined and exclude unnecessary props coming from media library config
      const expectedImage = pick(image, IMAGE_SCHEMA_FIELDS);

      return {
        ...expectedImage,
        alternativeText: expectedImage.alternativeText || expectedImage.name,
        url: prefixFileUrlWithBackendUrl(image.url),
      };
    });

    insertImages(formattedImages);

    if (isLastBlockType(editor, 'image')) {
      // Insert blank line to add new blocks below image block
      insertEmptyBlockAtLast(editor);
    }

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

/* -------------------------------------------------------------------------------------------------
 * BlocksDropdown
 * -----------------------------------------------------------------------------------------------*/
export const BlocksDropdown = ({ disabled }) => {
  const editor = useSlate();
  const { formatMessage } = useIntl();
  const [isMediaLibraryVisible, setIsMediaLibraryVisible] = React.useState(false);

  const blocks = useBlocksStore();
  const blockKeysToInclude = Object.entries(blocks).reduce((currentKeys, entry) => {
    const [key, block] = entry;

    return block.isInBlocksSelector ? [...currentKeys, key] : currentKeys;
  }, []);

  const [selectedOption, setSelectedOption] = React.useState(Object.keys(blocks)[0]);

  /**
   * Manages the selection of a block options in the dropdown and changes the node inside the Slate Editor.
   * @param {object} value - the value of the selected option in the BlocksDropdown select
   */
  const selectBlock = (value) => {
    const { type, level } = value;

    const newProperties = {
      type,
      level: level || null,
    };

    Transforms.setNodes(editor, newProperties);
  };

  /**
   * Handles the selection of a block option in the Blocks Dropdown.
   * @param {string} optionKey - key of the option selected
   */
  const handleSelectOption = (optionKey) => {
    if (optionKey === 'image') {
      // Image node created using select or existing selection node needs to be deleted before adding new image nodes
      Transforms.removeNodes(editor);
    } else {
      selectBlock(blocks[optionKey].value);
    }

    setSelectedOption(optionKey);

    if (optionKey === 'code' && isLastBlockType(editor, 'code')) {
      // Insert blank line to add new blocks below code block
      insertEmptyBlockAtLast(editor);
    }

    if (optionKey === 'image') {
      setIsMediaLibraryVisible(true);
    }
  };

  // Listen to the selection change and update the selected block in the dropdown
  React.useEffect(() => {
    if (editor.selection) {
      // Get the parent node of the anchor
      const [anchorNode] = Editor.parent(editor, editor.selection.anchor);
      // Find the block key that matches the anchor node
      const anchorBlockKey = Object.keys(blocks).find((blockKey) =>
        blocks[blockKey].matchNode(anchorNode)
      );

      // Change the value selected in the dropdown if it doesn't match the anchor block key
      if (anchorBlockKey && anchorBlockKey !== selectedOption) {
        setSelectedOption(anchorBlockKey);
      }
    }
  }, [editor.selection, editor, blocks, selectedOption]);

  return (
    <>
      <Select
        startIcon={<Icon as={blocks[selectedOption].icon} />}
        onChange={handleSelectOption}
        placeholder={blocks[selectedOption].label}
        value={selectedOption}
        aria-label={formatMessage({
          id: 'components.Blocks.blocks.selectBlock',
          defaultMessage: 'Select a block',
        })}
        disabled={disabled}
      >
        {blockKeysToInclude.map((key) => (
          <BlockOption
            key={key}
            value={key}
            label={blocks[key].label}
            icon={blocks[key].icon}
            selectedOption={selectedOption}
          />
        ))}
      </Select>
      {isMediaLibraryVisible && <ImageDialog handleClose={() => setIsMediaLibraryVisible(false)} />}
    </>
  );
};

BlocksDropdown.propTypes = {
  disabled: PropTypes.bool.isRequired,
};

/* -------------------------------------------------------------------------------------------------
 * BlockOption
 * -----------------------------------------------------------------------------------------------*/
const BlockOption = ({ value, icon, label, selectedOption }) => {
  const { formatMessage } = useIntl();

  const isSelected = value === selectedOption;

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
  selectedOption: PropTypes.string.isRequired,
};

/* -------------------------------------------------------------------------------------------------
 * ListButton
 * -----------------------------------------------------------------------------------------------*/
const ListButton = ({ icon, format, label, disabled }) => {
  const editor = useSlate();

  /**
   * Check if the node is a list.
   * @param {import('slate').Node} node
   * @returns boolean
   */
  const isListNode = (node) => {
    return !Editor.isEditor(node) && SlateElement.isElement(node) && node.type === 'list';
  };

  /**
   * Check if the editor selection is a list block.
   * @returns boolean
   */
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

  /**
   * Creates a list block from the current editor selection.
   */
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
      disabled={disabled}
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
  disabled: PropTypes.bool.isRequired,
};

/* -------------------------------------------------------------------------------------------------
 * BlocksToolbar
 * -----------------------------------------------------------------------------------------------*/
const Separator = styled(Toolbar.Separator)`
  background: ${({ theme }) => theme.colors.neutral150};
  width: 1px;
  height: ${pxToRem(24)};
`;

const ToolbarWrapper = styled(Flex)`
  &[aria-disabled='true'] {
    cursor: not-allowed;
  }
`;

// TODO: Remove after the RTE Blocks Alpha release
const AlphaTag = styled(Box)`
  background-color: ${({ theme }) => theme.colors.warning100};
  border: ${({ theme }) => `1px solid ${theme.colors.warning200}`};
  border-radius: ${({ theme }) => theme.borderRadius};
  font-size: ${({ theme }) => theme.fontSizes[0]};
  padding: ${({ theme }) => `${2 / 16}rem ${theme.spaces[1]}`};
`;

const BlocksToolbar = ({ disabled }) => {
  const modifiers = useModifiersStore();

  return (
    <Toolbar.Root aria-disabled={disabled} asChild>
      {/* Remove after the RTE Blocks Alpha release (paddingRight and width) */}
      <ToolbarWrapper gap={1} padding={2} paddingRight={4} width="100%">
        <BlocksDropdown disabled={disabled} />
        <Toolbar.ToggleGroup type="multiple" asChild>
          <Flex gap={1} marginLeft={1}>
            {Object.entries(modifiers).map(([name, modifier]) => (
              <ToolbarButton
                key={name}
                name={name}
                icon={modifier.icon}
                label={modifier.label}
                isActive={modifier.checkIsActive()}
                handleClick={modifier.handleToggle}
                disabled={disabled}
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
                defaultMessage: 'Bulleted list',
              }}
              format="unordered"
              icon={BulletList}
              disabled={disabled}
            />
            <ListButton
              label={{
                id: 'components.Blocks.blocks.orderedList',
                defaultMessage: 'Numbered list',
              }}
              format="ordered"
              icon={NumberList}
              disabled={disabled}
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
      </ToolbarWrapper>
    </Toolbar.Root>
  );
};

BlocksToolbar.propTypes = {
  disabled: PropTypes.bool.isRequired,
};

export { BlocksToolbar };
