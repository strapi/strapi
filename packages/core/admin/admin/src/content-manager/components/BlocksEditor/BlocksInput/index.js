import * as React from 'react';

import { Box, Flex, Icon } from '@strapi/design-system';
import { Drag } from '@strapi/icons';
import PropTypes from 'prop-types';
import { Editable, useSlate, ReactEditor } from 'slate-react';
import styled, { useTheme } from 'styled-components';

import { useDragAndDrop } from '../../../hooks/useDragAndDrop';
import { composeRefs, ItemTypes } from '../../../utils';
import { useBlocksStore } from '../hooks/useBlocksStore';
import { useModifiersStore } from '../hooks/useModifiersStore';

const getEditorStyle = (theme) => ({
  // The outline style is set on the wrapper with :focus-within
  outline: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spaces[2],
  height: '100%',
});

const DragItem = styled(Flex)`
  padding-left: ${({ theme }) => theme.spaces[2]};

  // block styles
  & > *:nth-child(2) {
    width: 100%;
    opacity: inherit;
  }

  &:hover {
    & > div {
      visibility: visible;
      opacity: inherit;
    }
  }

  &:active {
    opacity: 0.5;
  }
`;

const DragButton = styled(Flex)`
  cursor: pointer;
  visibility: hidden;
  display: ${({ isHidden }) => isHidden && 'none'};

  &:hover {
    background: ${({ theme }) => theme.colors.neutral200};
  }

  &:active {
    cursor: grabbing;
    background: ${({ theme }) => theme.colors.neutral200};
  }
`;

const BlockPlaceholder = () => (
  <Box
    borderStyle="solid"
    borderColor="secondary200"
    borderWidth="2px"
    width="calc(100% - 24px)"
    marginLeft="auto"
  />
);

const DragAndDropElement = ({
  children,
  index,
  disabled,
  canDrag,
  name,
  onMoveItem,
  blockType,
}) => {
  const [{ handlerId, isDragging, handleKeyDown }, myRef, boxRef, dropRef, dragRef] =
    useDragAndDrop(!disabled && canDrag, {
      type: `${ItemTypes.BLOCKS}._${name}`,
      canDrop() {
        return canDrag; // exclude listNode from drag and drop
      },
      index,
      item: {
        displayedValue: children,
        type: blockType,
      },
      onMoveItem,
    });

  const composedRefs = composeRefs(myRef, dragRef);
  const composedBoxRefs = composeRefs(boxRef, dropRef);

  return (
    <Box ref={composedBoxRefs}>
      {isDragging ? (
        <BlockPlaceholder />
      ) : (
        <DragItem ref={composedRefs} data-handler-id={handlerId} gap={2} isDragging={isDragging}>
          <DragButton
            role="button"
            tabIndex={0}
            aria-label="Drag"
            onKeyDown={handleKeyDown}
            color="neutral600"
            alignItems="center"
            justifyContent="center"
            hasRadius
            height={6}
            width={4}
            display={canDrag ? 'flex' : 'none'}
          >
            <Icon width={3} height={3} as={Drag} color="neutral600" />
          </DragButton>
          {children}
        </DragItem>
      )}
    </Box>
  );
};

DragAndDropElement.propTypes = {
  children: PropTypes.node.isRequired,
  index: PropTypes.number.isRequired,
  disabled: PropTypes.bool.isRequired,
  canDrag: PropTypes.bool.isRequired,
  name: PropTypes.string.isRequired,
  onMoveItem: PropTypes.func.isRequired,
  blockType: PropTypes.string.isRequired,
};

const baseRenderElement = (props, blocks, editor, disabled, name, handleMoveItem) => {
  const blockMatch = Object.values(blocks).find((block) => block.matchNode(props.element));
  const block = blockMatch || blocks.paragraph;

  const nodePath = ReactEditor.findPath(editor, props.element);
  const currElemIndex = parseInt(nodePath.join(''), 10);

  return (
    <DragAndDropElement
      index={currElemIndex}
      disabled={disabled}
      canDrag={block.value.type !== 'list'}
      name={name}
      onMoveItem={handleMoveItem}
      blockType={block.value.type}
    >
      {block.renderElement(props)}
    </DragAndDropElement>
  );
};

const baseRenderLeaf = (props, modifiers) => {
  // Recursively wrap the children for each active modifier
  const wrappedChildren = Object.entries(modifiers).reduce((currentChildren, modifierEntry) => {
    const [name, modifier] = modifierEntry;

    if (props.leaf[name]) {
      return modifier.renderLeaf(currentChildren);
    }

    return currentChildren;
  }, props.children);

  return <span {...props.attributes}>{wrappedChildren}</span>;
};

const BlocksInput = ({ disabled, placeholder, name, handleMoveItem }) => {
  const theme = useTheme();
  const editor = useSlate();
  const blocksRef = React.useRef();

  // Create renderLeaf function based on the modifiers store
  const modifiers = useModifiersStore();
  const renderLeaf = React.useCallback((props) => baseRenderLeaf(props, modifiers), [modifiers]);

  // Create renderElement function base on the blocks store
  const blocks = useBlocksStore();
  const renderElement = React.useCallback(
    (props) => baseRenderElement(props, blocks, editor, disabled, name, handleMoveItem),
    [blocks, editor, disabled, name, handleMoveItem]
  );

  const handleEnter = () => {
    const selectedNode = editor.children[editor.selection.anchor.path[0]];
    const selectedBlock = Object.values(blocks).find((block) => block.matchNode(selectedNode));

    // Check if there's an enter handler for the selected block
    if (selectedBlock.handleEnterKey) {
      selectedBlock.handleEnterKey(editor);
    } else {
      // If not, insert a new paragraph
      blocks.paragraph.handleEnterKey(editor);
    }
  };

  const handleBackspaceEvent = (event) => {
    const selectedNode = editor.children[editor.selection.anchor.path[0]];
    const selectedBlock = Object.values(blocks).find((block) => block.matchNode(selectedNode));

    if (selectedBlock.handleBackspaceKey) {
      selectedBlock.handleBackspaceKey(editor, event);
    }
  };

  const handleEditorKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleEnter();
    }
    if (event.key === 'Backspace') {
      handleBackspaceEvent(event);
    }
  };

  /**
   *  scrollSelectionIntoView : Slate's default method to scroll a DOM selection into the view,
   *  thats shifting layout for us when there is a overflowY:scroll on the viewport.
   *  We are overriding it to check if the selection is not fully within the visible area of the editor,
   *  we use scrollBy one line to the bottom
   */
  const handleScrollSelectionIntoView = (_, domRange) => {
    const domRect = domRange.getBoundingClientRect();
    const blocksInput = blocksRef.current;
    const editorRect = blocksInput.getBoundingClientRect();

    // Check if the selection is not fully within the visible area of the editor
    if (domRect.top < editorRect.top || domRect.bottom > editorRect.bottom) {
      // Scroll by one line to the bottom
      blocksInput.scrollBy({
        top: 28, // 20px is the line-height + 8px line gap
        behavior: 'smooth',
      });
    }
  };

  const onDrop = () => {
    // As we have our own handler to drag and drop the elements
    // returing true will skip slate's own event handler

    return true;
  };

  return (
    <Box
      ref={blocksRef}
      grow={1}
      width="100%"
      overflow="auto"
      fontSize={2}
      background="neutral0"
      color="neutral800"
      lineHeight={6}
      hasRadius
      paddingRight={4}
      marginTop={3}
      marginBottom={3}
    >
      <Editable
        readOnly={disabled}
        placeholder={placeholder}
        style={getEditorStyle(theme)}
        renderElement={renderElement}
        renderLeaf={renderLeaf}
        onKeyDown={handleEditorKeyDown}
        scrollSelectionIntoView={handleScrollSelectionIntoView}
        onDrop={onDrop}
      />
    </Box>
  );
};

BlocksInput.defaultProps = {
  placeholder: null,
};

BlocksInput.propTypes = {
  disabled: PropTypes.bool.isRequired,
  placeholder: PropTypes.string,
  name: PropTypes.string.isRequired,
  handleMoveItem: PropTypes.func.isRequired,
};

export default BlocksInput;
