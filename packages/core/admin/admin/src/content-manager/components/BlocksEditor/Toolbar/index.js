import * as React from 'react';

import * as Toolbar from '@radix-ui/react-toolbar';
import { Flex, Icon, Tooltip, SingleSelect, SingleSelectOption, Box } from '@strapi/design-system';
import { pxToRem, prefixFileUrlWithBackendUrl, useLibrary } from '@strapi/helper-plugin';
import { Link } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Editor, Transforms, Element as SlateElement } from 'slate';
import { ReactEditor, useSlate } from 'slate-react';
import styled from 'styled-components';

import { useBlocksStore } from '../hooks/useBlocksStore';
import { useModifiersStore } from '../hooks/useModifiersStore';
import { insertLink } from '../utils/links';

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

const SelectWrapper = styled(Box)`
  // Styling changes to SingleSelect component don't work, so adding wrapper to target SingleSelect
  div[role='combobox'] {
    border: none;
    cursor: pointer;

    &[aria-disabled='false']:hover {
      cursor: pointer;
      background: ${({ theme }) => theme.colors.primary100};
    }

    &[aria-disabled] {
      background: transparent;
      cursor: inherit;

      // Select text and icons should also have disabled color
      span {
        color: ${({ theme }) => theme.colors.neutral600};
      }
    }
  }
`;

const ToolbarButton = ({ icon, name, label, isActive, disabled, handleClick }) => {
  const editor = useSlate();
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
          disabled={disabled}
          background={isActive ? 'primary100' : ''}
          alignItems="center"
          justifyContent="center"
          width={7}
          height={7}
          hasRadius
          onMouseDown={() => {
            handleClick();
            // When a button is clicked it blurs the editor, restore the focus to the editor
            ReactEditor.focus(editor);
          }}
          aria-label={labelMessage}
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

const toggleBlock = (editor, value) => {
  const { type, level, format } = value;

  // Set the selected block properties received from the useBlockStore
  const blockProperties = {
    type,
    level: level || null,
    format: format || null,
  };

  if (editor.selection) {
    // If the selection is inside a list, split the list so that the modified block is outside of it
    Transforms.unwrapNodes(editor, {
      match: (node) => node.type === 'list',
      split: true,
    });

    // When there is a selection, update the existing block in the tree
    Transforms.setNodes(editor, blockProperties);
  } else {
    /**
     * When there is no selection, we want to insert a new block just after
     * the last node inserted and prevent the code to add an empty paragraph
     * between them.
     */
    const [, lastNodePath] = Editor.last(editor, []);
    const [parentNode] = Editor.parent(editor, lastNodePath, {
      // Makes sure we get a block node, not an inline node
      match: (node) => node.type !== 'text',
    });
    Transforms.removeNodes(editor, {
      void: true,
      hanging: true,
      at: {
        anchor: { path: lastNodePath, offset: 0 },
        focus: { path: lastNodePath, offset: 0 },
      },
    });
    Transforms.insertNodes(
      editor,
      {
        ...blockProperties,
        children: parentNode.children,
      },
      {
        at: [lastNodePath[0]],
        select: true,
      }
    );
  }

  // When the select is clicked it blurs the editor, restore the focus to the editor
  ReactEditor.focus(editor);
};

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
    // If the selection is inside a list, split the list so that the modified block is outside of it
    Transforms.unwrapNodes(editor, {
      match: (node) => node.type === 'list',
      split: true,
    });

    // Save the path of the node that is being replaced by an image to insert the images there later
    // It's the closest full block node above the selection
    const [, pathToInsert] = Editor.above(editor, {
      match(node) {
        const isInlineNode = ['text', 'link'].includes(node.type);

        return !isInlineNode;
      },
    });

    // Remove the previous node that is being replaced by an image
    Transforms.removeNodes(editor);

    // Convert images to nodes and insert them
    const nodesToInsert = images.map((image) => {
      return { type: 'image', image, children: [{ type: 'text', text: '' }] };
    });
    Transforms.insertNodes(editor, nodesToInsert, { at: pathToInsert });
  };

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
      allowedTypes={['images']}
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

const BlocksDropdown = ({ disabled }) => {
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
    if (['list-ordered', 'list-unordered'].includes(optionKey)) {
      // retrieve the list format
      const listFormat = blocks[optionKey].value.format;

      // check if the list is already active
      const isActive = isListActive(editor, blocks[optionKey].matchNode);

      // toggle the list
      toggleList(editor, isActive, listFormat);
    } else if (optionKey !== 'image') {
      toggleBlock(editor, blocks[optionKey].value);
    }

    setBlockSelected(optionKey);

    if (optionKey === 'code' && isLastBlockType(editor, 'code')) {
      // Insert blank line to add new blocks below code block
      insertEmptyBlockAtLast(editor);
    }

    if (optionKey === 'image') {
      setIsMediaLibraryVisible(true);
    }
  };

  /**
   * Prevent the select from focusing itself so ReactEditor.focus(editor) can focus the editor instead.
   *
   * The editor first loses focus to a blur event when clicking the select button. However,
   * refocusing the editor is not enough since the select's default behavior is to refocus itself
   * after an option is selected.
   *
   */
  const preventSelectFocus = (e) => e.preventDefault();

  // Listen to the selection change and update the selected block in the dropdown
  React.useEffect(() => {
    if (editor.selection) {
      // Get the parent node of the anchor
      // with a depth of two to retrieve also the list item parents
      const [anchorNode] = Editor.parent(editor, editor.selection.anchor, {
        edge: 'start',
        depth: 2,
      });
      // Find the block key that matches the anchor node
      const anchorBlockKey = Object.keys(blocks).find((blockKey) =>
        blocks[blockKey].matchNode(anchorNode)
      );

      // Change the value selected in the dropdown if it doesn't match the anchor block key
      if (anchorBlockKey && anchorBlockKey !== blockSelected) {
        setBlockSelected(anchorBlockKey);
      }
    }
  }, [editor.selection, editor, blocks, blockSelected]);

  return (
    <>
      <SelectWrapper>
        <SingleSelect
          startIcon={<Icon as={blocks[blockSelected].icon} />}
          onChange={selectOption}
          placeholder={blocks[blockSelected].label}
          value={blockSelected}
          onCloseAutoFocus={preventSelectFocus}
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
        </SingleSelect>
      </SelectWrapper>
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
    <SingleSelectOption
      startIcon={<Icon as={icon} color={isSelected ? 'primary600' : 'neutral600'} />}
      value={value}
    >
      {formatMessage(label)}
    </SingleSelectOption>
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

/**
 *
 * @param {import('slate').Node} node
 * @returns boolean
 */
const isListNode = (node) => {
  return !Editor.isEditor(node) && SlateElement.isElement(node) && node.type === 'list';
};

const isListActive = (editor, matchNode) => {
  const { selection } = editor;

  if (!selection) return false;

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: matchNode,
    })
  );

  return Boolean(match);
};

const toggleList = (editor, isActive, format) => {
  // If we have selected a portion of content in the editor,
  // we want to convert it to a list or if it is already a list,
  // convert it back to a paragraph
  if (editor.selection) {
    Transforms.unwrapNodes(editor, {
      match: (node) => isListNode(node) && ['ordered', 'unordered'].includes(node.format),
      split: true,
    });

    Transforms.setNodes(editor, {
      type: isActive ? 'paragraph' : 'list-item',
    });

    if (!isActive) {
      const block = { type: 'list', format, children: [] };
      Transforms.wrapNodes(editor, block);
    }
  } else {
    // There is no selection, convert the last inserted node to a list
    // If it is already a list, convert it back to a paragraph
    const [, lastNodePath] = Editor.last(editor, []);

    const [parentNode] = Editor.parent(editor, lastNodePath, {
      // Makes sure we get a block node, not an inline node
      match: (node) => node.type !== 'text',
    });

    Transforms.removeNodes(editor, {
      void: true,
      hanging: true,
      at: {
        anchor: { path: lastNodePath, offset: 0 },
        focus: { path: lastNodePath, offset: 0 },
      },
    });

    Transforms.insertNodes(
      editor,
      {
        type: isActive ? 'paragraph' : 'list-item',
        children: [...parentNode.children],
      },
      {
        at: [lastNodePath[0]],
        select: true,
      }
    );

    if (!isActive) {
      // If the selection is now a list item, wrap it inside a list
      const block = { type: 'list', format, children: [] };
      Transforms.wrapNodes(editor, block);
    }
  }
};

const ListButton = ({ block, disabled }) => {
  const editor = useSlate();

  const {
    icon,
    matchNode,
    value: { format },
    label,
  } = block;

  const isActive = isListActive(editor, matchNode);

  return (
    <ToolbarButton
      icon={icon}
      name={format}
      label={label}
      isActive={isActive}
      disabled={disabled}
      handleClick={() => toggleList(editor, isActive, format)}
    />
  );
};

ListButton.propTypes = {
  block: PropTypes.shape({
    icon: PropTypes.elementType.isRequired,
    matchNode: PropTypes.func.isRequired,
    value: PropTypes.shape({
      format: PropTypes.string.isRequired,
    }).isRequired,
    label: PropTypes.shape({
      id: PropTypes.string.isRequired,
      defaultMessage: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  disabled: PropTypes.bool.isRequired,
};

const LinkButton = ({ disabled }) => {
  const editor = useSlate();

  const isLinkActive = () => {
    const { selection } = editor;

    if (!selection) return false;

    const [match] = Array.from(
      Editor.nodes(editor, {
        at: Editor.unhangRange(editor, selection),
        match: (node) => SlateElement.isElement(node) && node.type === 'link',
      })
    );

    return Boolean(match);
  };

  const isLinkDisabled = () => {
    // Always disabled when the whole editor is disabled
    if (disabled) {
      return true;
    }

    // Always enabled when there's no selection
    if (!editor.selection) {
      return false;
    }

    // Get the block node closest to the anchor and focus
    const anchorNodeEntry = Editor.above(editor, {
      at: editor.selection.anchor,
      match: (node) => node.type !== 'text',
    });
    const focusNodeEntry = Editor.above(editor, {
      at: editor.selection.focus,
      match: (node) => node.type !== 'text',
    });

    // Disabled if the anchor and focus are not in the same block
    return anchorNodeEntry[0] !== focusNodeEntry[0];
  };

  const addLink = () => {
    // We insert an empty anchor, so we split the DOM to have a element we can use as reference for the popover
    insertLink(editor, { url: '' });
  };

  return (
    <ToolbarButton
      icon={Link}
      name="link"
      label={{
        id: 'components.Blocks.link',
        defaultMessage: 'Link',
      }}
      isActive={isLinkActive()}
      handleClick={addLink}
      disabled={isLinkDisabled()}
    />
  );
};

LinkButton.propTypes = {
  disabled: PropTypes.bool.isRequired,
};

const BlocksToolbar = ({ disabled }) => {
  const modifiers = useModifiersStore();
  const blocks = useBlocksStore();
  const editor = useSlate();

  /**
   * The modifier buttons are disabled when an image is selected.
   */

  const checkButtonDisabled = () => {
    // Always disabled when the whole editor is disabled
    if (disabled) {
      return true;
    }

    if (!editor.selection) {
      return false;
    }

    const selectedNode = editor.children[editor.selection.anchor.path[0]];

    if (['image', 'code'].includes(selectedNode.type)) {
      return true;
    }

    return false;
  };

  const isButtonDisabled = checkButtonDisabled();

  return (
    <Toolbar.Root aria-disabled={disabled} asChild>
      <ToolbarWrapper gap={2} padding={2}>
        <BlocksDropdown disabled={disabled} />
        <Separator />
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
                disabled={isButtonDisabled}
              />
            ))}
            <LinkButton disabled={isButtonDisabled} />
          </Flex>
        </Toolbar.ToggleGroup>
        <Separator />
        <Toolbar.ToggleGroup type="single" asChild>
          <Flex gap={1}>
            <ListButton block={blocks['list-unordered']} disabled={disabled} />
            <ListButton block={blocks['list-ordered']} disabled={disabled} />
          </Flex>
        </Toolbar.ToggleGroup>
      </ToolbarWrapper>
    </Toolbar.Root>
  );
};

BlocksToolbar.propTypes = {
  disabled: PropTypes.bool.isRequired,
};

export { BlocksToolbar };
