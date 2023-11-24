import * as React from 'react';

import { Box, Flex, Icon, VisuallyHidden } from '@strapi/design-system';
import { Drag } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { Editor, Range, Transforms } from 'slate';
import { ReactEditor, type RenderElementProps, type RenderLeafProps, Editable } from 'slate-react';
import styled from 'styled-components';

// @ts-expect-error TODO convert to ts
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
// @ts-expect-error TODO convert to ts
import { composeRefs, ItemTypes, getTrad } from '../../utils';

import { type BlocksStore, useBlocksEditorContext } from './BlocksEditor';
import { type ModifiersStore } from './Modifiers';
import { getEntries } from './utils/types';

const StyledEditable = styled(Editable)`
  // The outline style is set on the wrapper with :focus-within
  outline: none;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spaces[2]};
  height: 100%;

  > *:last-child {
    padding-bottom: ${({ theme }) => theme.spaces[3]};
  }
`;

const DragItem = styled(Flex)`
  // Style each block rendered using renderElement()
  & > *:nth-child(2) {
    width: 100%;
    opacity: inherit;
  }
  &:hover {
    // Set the visibility of drag button
    & > div {
      visibility: visible;
      opacity: inherit;
    }
  }
`;

const DragButton = styled(Flex)`
  visibility: hidden;
  cursor: grab;

  &:hover {
    background: ${({ theme }) => theme.colors.neutral200};
  }
  &:active {
    cursor: grabbing;
    background: ${({ theme }) => theme.colors.neutral200};
  }
`;

const NOT_DRAGGABLE_ITEMS = ['list'];
const NOT_DROPPABLE_ITEMS = ['list'];

type DragAndDropElementProps = {
  children: RenderElementProps['children'];
  index: Array<number>;
  canDrag: boolean;
  canDrop: boolean;
};

const DragAndDropElement = ({ children, index, canDrag, canDrop }: DragAndDropElementProps) => {
  const { editor, disabled, name, setLiveText } = useBlocksEditorContext('drag-and-drop');
  const { formatMessage } = useIntl();

  const handleMoveBlock = React.useCallback(
    (newIndex: Array<number>, currentIndex: Array<number>) => {
      const [newNode] = Editor.node(editor, newIndex);
      const [draggedNode] = Editor.node(editor, currentIndex);

      Transforms.moveNodes(editor, {
        at: currentIndex,
        to: newIndex,
      });

      // Add 1 to the index for the live text message
      const currentIndexPosition = [currentIndex[0] + 1, ...currentIndex.slice(1)];
      const newIndexPosition = [newIndex[0] + 1, ...newIndex.slice(1)];

      setLiveText(
        formatMessage(
          {
            id: getTrad('components.Blocks.dnd.reorder'),
            defaultMessage: '{item}, moved. New position in the editor: {position}.',
          },
          {
            item: `${name}.${currentIndexPosition.join(',')}`,
            position: `${newIndexPosition.join(',')} of ${editor.children.length}`,
          }
        )
      );

      // If a node is dragged into the list block then convert it to a list-item
      if (newNode.type === 'list-item' && draggedNode.type !== 'list-item') {
        if (newIndex[0] > currentIndex[0]) {
          // Node is dragged downwards inside list
          newIndex[0] -= 1;
        }

        const { type: _type, children: _children, ...extra } = draggedNode;
        const attributesToClear: Record<string, null> = {};
        Object.keys(extra).forEach((key) => {
          attributesToClear[key] = null;
        });

        Transforms.setNodes(editor, { ...attributesToClear, type: 'list-item' }, { at: newIndex });
      }

      // If a node is dragged out of the list block then convert it to a paragraph
      if (newNode.type !== 'list-item' && draggedNode.type === 'list-item') {
        Transforms.setNodes(editor, { type: 'paragraph' }, { at: newIndex });

        if (newIndex[0] < currentIndex[0]) {
          // Node is dragged upwards out of list block
          currentIndex[0] += 1;
        }
      }

      // If a dragged node is the only list-item then delete list block
      if (draggedNode.type === 'list-item') {
        const [listNode, listNodePath] = Editor.parent(editor, currentIndex);

        const isListEmpty =
          listNode.children?.length === 1 &&
          listNode.children?.[0].type === 'text' &&
          listNode.children?.[0].text === '';
        if (isListEmpty) {
          Transforms.removeNodes(editor, { at: listNodePath });
        }
      }
    },
    [editor, formatMessage, name, setLiveText]
  );

  const [
    { handlerId, isDragging, handleKeyDown: handleDragHandleKeyDown },
    blockRef,
    dropRef,
    dragRef,
  ] = useDragAndDrop(!disabled && canDrag, {
    type: `${ItemTypes.BLOCKS}._${name}`,
    canDropHandler() {
      return canDrop;
    },
    index,
    item: {
      displayedValue: children,
    },
    onMoveItem: handleMoveBlock,
  });

  const composedBoxRefs = composeRefs(blockRef, dropRef);

  return (
    <Box ref={composedBoxRefs}>
      {isDragging ? (
        <>
          <Box
            borderStyle="solid"
            borderColor="secondary200"
            borderWidth="2px"
            width="calc(100% - 24px)"
            marginLeft="auto"
            marginTop={2}
            marginBottom={2}
          />
          {/* Rendering the block is necessary for Slate to locate the node, 
              however while dragging, we hide the rendered block */}
          <VisuallyHidden aria-hidden>{children}</VisuallyHidden>
        </>
      ) : (
        <DragItem
          ref={dragRef}
          data-handler-id={handlerId}
          gap={2}
          paddingLeft={2}
          alignItems="start"
          onDragStart={(event) => {
            const target = event.target as HTMLElement;
            target.style.opacity = '0.5';
          }}
          onDragEnd={(event) => {
            const target = event.target as HTMLElement;
            target.style.opacity = '1';
          }}
        >
          <DragButton
            role="button"
            tabIndex={0}
            aria-label="Drag"
            onKeyDown={handleDragHandleKeyDown}
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

const baseRenderLeaf = (props: RenderLeafProps, modifiers: ModifiersStore) => {
  // Recursively wrap the children for each active modifier
  const wrappedChildren = getEntries(modifiers).reduce((currentChildren, modifierEntry) => {
    const [name, modifier] = modifierEntry;

    if (props.leaf[name]) {
      return modifier.renderLeaf(currentChildren);
    }

    return currentChildren;
  }, props.children);

  return <span {...props.attributes}>{wrappedChildren}</span>;
};

type BaseRenderElementProps = {
  props: RenderElementProps['children'];
  blocks: BlocksStore;
  editor: Editor;
};

const baseRenderElement = ({ props, blocks, editor }: BaseRenderElementProps) => {
  const blockMatch = Object.values(blocks).find((block) => block.matchNode(props.element));
  const block = blockMatch || blocks.paragraph;
  const nodePath = ReactEditor.findPath(editor, props.element);

  // Link is inline block so it cannot be dragged
  if (block.value.type === 'link') return block.renderElement(props);

  return (
    <DragAndDropElement
      index={nodePath}
      canDrag={!NOT_DRAGGABLE_ITEMS.includes(block.value.type)}
      canDrop={!NOT_DROPPABLE_ITEMS.includes(block.value.type)}
    >
      {block.renderElement(props)}
    </DragAndDropElement>
  );
};

interface BlocksInputProps {
  placeholder?: string;
}

const BlocksContent = ({ placeholder }: BlocksInputProps) => {
  const { editor, disabled, blocks, modifiers, setLiveText } =
    useBlocksEditorContext('BlocksContent');
  const blocksRef = React.useRef<HTMLDivElement>(null);
  const { formatMessage } = useIntl();

  // Create renderLeaf function based on the modifiers store
  const renderLeaf = React.useCallback(
    (props: RenderLeafProps) => baseRenderLeaf(props, modifiers),
    [modifiers]
  );

  const handleMoveBlocks = (editor: Editor, event: React.KeyboardEvent<HTMLElement>) => {
    if (!editor.selection) return;

    const start = Range.start(editor.selection);
    const currentIndex = [start.path[0]];
    let newIndexPosition = 0;

    if (event.key === 'ArrowUp') {
      newIndexPosition = currentIndex[0] > 0 ? currentIndex[0] - 1 : currentIndex[0];
    } else {
      newIndexPosition =
        currentIndex[0] < editor.children.length - 1 ? currentIndex[0] + 1 : currentIndex[0];
    }

    const newIndex = [newIndexPosition];

    if (newIndexPosition !== currentIndex[0]) {
      Transforms.moveNodes(editor, {
        at: currentIndex,
        to: newIndex,
      });

      setLiveText(
        formatMessage(
          {
            id: getTrad('components.Blocks.dnd.reorder'),
            defaultMessage: '{item}, moved. New position in the editor: {position}.',
          },
          {
            item: `${name}.${currentIndex[0] + 1}`,
            position: `${newIndex[0] + 1} of ${editor.children.length}`,
          }
        )
      );

      event.preventDefault();
    }
  };

  // Create renderElement function base on the blocks store
  const renderElement = React.useCallback(
    (props: RenderElementProps) => baseRenderElement({ props, blocks, editor }),
    [blocks, editor]
  );

  const handleEnter = () => {
    if (!editor.selection) {
      return;
    }

    const selectedNode = editor.children[editor.selection.anchor.path[0]];
    const selectedBlock = Object.values(blocks).find((block) => block.matchNode(selectedNode));
    if (!selectedBlock) {
      return;
    }

    if (selectedBlock.handleEnterKey) {
      selectedBlock.handleEnterKey(editor);
    } else {
      blocks.paragraph.handleEnterKey!(editor);
    }
  };

  const handleBackspaceEvent = (event: React.KeyboardEvent<HTMLElement>) => {
    if (!editor.selection) {
      return;
    }

    const selectedNode = editor.children[editor.selection.anchor.path[0]];
    const selectedBlock = Object.values(blocks).find((block) => block.matchNode(selectedNode));

    if (!selectedBlock) {
      return;
    }

    if (selectedBlock.handleBackspaceKey) {
      selectedBlock.handleBackspaceKey(editor, event);
    }
  };

  /**
   * Modifier keyboard shortcuts
   */
  const handleKeyboardShortcuts = (event: React.KeyboardEvent<HTMLElement>) => {
    const isCtrlOrCmd = event.metaKey || event.ctrlKey;

    if (isCtrlOrCmd) {
      Object.values(modifiers).forEach((value) => {
        if (value.isValidEventKey(event)) {
          value.handleToggle(editor);
          return;
        }
      });
      if (event.shiftKey && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
        handleMoveBlocks(editor, event);
      }
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLElement> = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleEnter();
    }
    if (event.key === 'Backspace') {
      handleBackspaceEvent(event);
    }
    handleKeyboardShortcuts(event);
  };

  /**
   *  scrollSelectionIntoView : Slate's default method to scroll a DOM selection into the view,
   *  thats shifting layout for us when there is a overflowY:scroll on the viewport.
   *  We are overriding it to check if the selection is not fully within the visible area of the editor,
   *  we use scrollBy one line to the bottom
   */
  const handleScrollSelectionIntoView = (_: ReactEditor, domRange: Range) => {
    const domRect = domRange.getBoundingClientRect();
    const blocksInput = blocksRef.current;

    if (!blocksInput) {
      return;
    }

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
      paddingRight={4}
      paddingTop={3}
    >
      <StyledEditable
        readOnly={disabled}
        placeholder={placeholder}
        renderElement={renderElement}
        renderLeaf={renderLeaf}
        onKeyDown={handleKeyDown}
        scrollSelectionIntoView={handleScrollSelectionIntoView}
        onDrop={onDrop}
      />
    </Box>
  );
};

export { BlocksContent };
