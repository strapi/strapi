import * as React from 'react';

import { Box, Flex, Icon } from '@strapi/design-system';
import { Drag } from '@strapi/icons';
import { type Editor } from 'slate';
import { ReactEditor, type RenderElementProps, type RenderLeafProps, Editable } from 'slate-react';
import styled from 'styled-components';

// @ts-expect-error TODO convert to ts
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
// @ts-expect-error TODO convert to ts
import { composeRefs, ItemTypes } from '../../utils';

import { BlocksStore, useBlocksEditorContext } from './BlocksEditor';
import { type ModifiersStore, useModifiersStore } from './hooks/useModifiersStore';
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
  index: number | Array<number>;
  disabled: boolean;
  canDrag: boolean;
  canDrop: boolean;
  name: string;
  onMoveItem: (newIndex: Array<number>, currentIndex: Array<number>) => void;
};

const DragAndDropElement = ({
  children,
  index,
  disabled,
  canDrag,
  canDrop,
  name,
  onMoveItem,
}: DragAndDropElementProps) => {
  const [{ handlerId, isDragging, handleKeyDown }, myRef, boxRef, dropRef, dragRef] =
    useDragAndDrop(!disabled && canDrag, {
      type: `${ItemTypes.BLOCKS}._${name}`,
      canDropHandler() {
        return canDrop;
      },
      index,
      item: {
        displayedValue: children,
      },
      onMoveItem,
    });

  const composedRefs = composeRefs(myRef, dragRef);
  const composedBoxRefs = composeRefs(boxRef, dropRef);

  return (
    <Box ref={composedBoxRefs}>
      {isDragging ? (
        <Box
          borderStyle="solid"
          borderColor="secondary200"
          borderWidth="2px"
          width="calc(100% - 24px)"
          marginLeft="auto"
        />
      ) : (
        <DragItem
          ref={composedRefs}
          data-handler-id={handlerId}
          gap={2}
          isDragging={isDragging}
          paddingLeft={2}
        >
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

type baseRenderElementProps = {
  props: RenderElementProps['children'];
  blocks: BlocksStore;
  name: string;
  disabled: boolean;
  editor: Editor;
  handleMoveItem: (newIndex: Array<number>, currentIndex: Array<number>) => void;
};

const baseRenderElement = ({
  props,
  blocks,
  name,
  editor,
  disabled,
  handleMoveItem,
}: baseRenderElementProps) => {
  const blockMatch = Object.values(blocks).find((block) => block.matchNode(props.element));
  const block = blockMatch || blocks.paragraph;
  const nodePath = ReactEditor.findPath(editor, props.element);
  const currElemIndex = parseInt(nodePath.join(''), 10);

  return (
    <DragAndDropElement
      index={nodePath}
      disabled={disabled}
      canDrag={!NOT_DRAGGABLE_ITEMS.includes(block.value.type)}
      canDrop={!NOT_DROPPABLE_ITEMS.includes(block.value.type)}
      name={name}
      onMoveItem={handleMoveItem}
    >
      {block.renderElement(props)}
    </DragAndDropElement>
  );
};

interface BlocksInputProps {
  placeholder?: string;
  name: string;
  handleMoveItem: (newIndex: Array<number>, currentIndex: Array<number>) => void;
}

const BlocksContent = ({ placeholder, name, handleMoveItem }: BlocksInputProps) => {
  const { editor, disabled, blocks } = useBlocksEditorContext('BlocksContent');
  const blocksRef = React.useRef<HTMLDivElement>(null);

  // Create renderLeaf function based on the modifiers store
  const modifiers = useModifiersStore();
  const renderLeaf = React.useCallback(
    (props: RenderLeafProps) => baseRenderLeaf(props, modifiers),
    [modifiers]
  );

  // Create renderElement function base on the blocks store
  const renderElement = React.useCallback(
    (props: RenderElementProps) =>
      baseRenderElement({ props, blocks, editor, disabled, name, handleMoveItem }),
    [blocks, editor, disabled, name, handleMoveItem]
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
          value.handleToggle();
        }
      });
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
