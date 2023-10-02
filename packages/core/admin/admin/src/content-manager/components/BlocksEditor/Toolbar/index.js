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

const ToolbarWrapper = styled(Flex)`
  &[aria-disabled='true'] {
    cursor: not-allowed;
  }
`;

const Separator = styled(Toolbar.Separator)`
  background: ${({ theme }) => theme.colors.neutral150};
  width: 1px;
  height: ${pxToRem(24)};
`;

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

const ModifierButton = ({ icon, name, label, disabled }) => {
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
      disabled={disabled}
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
  disabled: PropTypes.bool.isRequired,
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

    if (isLastBlockType(editor, 'image')) {
      // insert blank line to add new blocks below image block
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
 * Function that finds the corresponding block key in the blocks object based on the targetType and targetLevel (if present) provided.
 * @param {object} blocks - blocks object
 * @param {string} targetType - type of the target block
 * @param {number} targetLevel - level of the target block
 * @returns string|null - block key or null if no matching block is found
 */
const findBlockKeyByTypeAndLevel = (blocks, targetType, targetLevel = null) => {
  const blockKey = Object.keys(blocks).find((key) => {
    const block = blocks[key];

    return (
      block.value &&
      block.value.type === targetType &&
      (targetLevel === null || block.value.level === targetLevel)
    );
  });

  return blockKey || null; // Return null if no matching block is found
};

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

export const BlocksDropdown = ({ disabled }) => {
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
    if (optionKey === 'image') {
      // Image node created using select or existing selection node needs to be deleted before adding new image nodes
      Transforms.removeNodes(editor);
    } else {
      toggleBlock(editor, blocks[optionKey].value);
    }

    setBlockSelected(optionKey);

    if (optionKey === 'code' && isLastBlockType(editor, 'code')) {
      // insert blank line to add new blocks below code block
      insertEmptyBlockAtLast(editor);
    }

    if (optionKey === 'image') {
      setIsMediaLibraryVisible(true);
    }
  };

  React.useEffect(() => {
    if (editor.selection) {
      const [anchorNode] = Editor.parent(editor, editor.selection.anchor); // Get the parent node of the anchor

      if (anchorNode) {
        const blockKey = findBlockKeyByTypeAndLevel(blocks, anchorNode.type, anchorNode?.level);

        if (blockKey && blockKey !== blockSelected) {
          setBlockSelected(blockKey);
        }
      }
    }
  }, [editor.selection, editor, blocks, blockSelected]);

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
        disabled={disabled}
      >
        {blockKeysToInclude.map((key) => (
          <BlockOption
            key={key}
            value={key}
            label={blocks[key].label}
            icon={blocks[key].icon}
            blockSelected={blockSelected}
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

const BlockOption = ({ value, icon, label, blockSelected }) => {
  const { formatMessage } = useIntl();

  const isSelected = value === blockSelected;

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
  blockSelected: PropTypes.string.isRequired,
};

const ListButton = ({ icon, format, label, disabled }) => {
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
