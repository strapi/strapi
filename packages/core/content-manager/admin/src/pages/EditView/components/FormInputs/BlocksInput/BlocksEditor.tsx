import * as React from 'react';

import { createContext, type FieldValue, useIsMobile } from '@strapi/admin/strapi-admin';
import { IconButton, Divider, VisuallyHidden } from '@strapi/design-system';
import { Expand } from '@strapi/icons';
import { MessageDescriptor, useIntl } from 'react-intl';
import { Editor, type Descendant, createEditor, Transforms, Element } from 'slate';
import { withHistory } from 'slate-history';
import { type RenderElementProps, Slate, withReact, ReactEditor, useSlate } from 'slate-react';
import { styled, type CSSProperties } from 'styled-components';

import { getTranslation } from '../../../../../utils/translations';

import { codeBlocks } from './Blocks/Code';
import { headingBlocks } from './Blocks/Heading';
import { imageBlocks } from './Blocks/Image';
import { linkBlocks } from './Blocks/Link';
import { listBlocks } from './Blocks/List';
import { paragraphBlocks } from './Blocks/Paragraph';
import { quoteBlocks } from './Blocks/Quote';
import { BlocksContent, type BlocksContentProps } from './BlocksContent';
import { BlocksToolbar } from './BlocksToolbar';
import { EditorLayout } from './EditorLayout';
import { type ModifiersStore, modifiers } from './Modifiers';
import { withStrapiSchema } from './plugins/withStrapiSchema';
import { isNonNullable } from './utils/types';

import type { Schema } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * BlocksEditorProvider
 * -----------------------------------------------------------------------------------------------*/

interface BaseBlock {
  renderElement: (props: RenderElementProps) => React.JSX.Element;
  /** Function to check if a given node is of this type of block */
  matchNode: (node: Schema.Attribute.BlocksNode) => boolean;
  handleConvert?: (editor: Editor) => void | (() => React.JSX.Element);
  handleEnterKey?: (editor: Editor) => void;
  handleBackspaceKey?: (editor: Editor, event: React.KeyboardEvent<HTMLElement>) => void;
  handleTab?: (editor: Editor) => void;
  snippets?: string[];
  /** Adjust the vertical positioning of the drag-to-reorder grip icon */
  dragHandleTopMargin?: CSSProperties['marginTop'];
  /** A Slate plugin: function that will wrap the editor creation */
  plugin?: (editor: Editor) => Editor;
  /**
   * Function that checks if an element should be draggable
   * @default () => true */
  isDraggable?: (element: Element) => boolean;
}

interface NonSelectorBlock extends BaseBlock {
  isInBlocksSelector: false;
}

interface SelectorBlock extends BaseBlock {
  isInBlocksSelector: true;
  icon: React.ComponentType;
  label: MessageDescriptor;
}

type NonSelectorBlockKey = 'list-item' | 'link';

const selectorBlockKeys = [
  'paragraph',
  'heading-one',
  'heading-two',
  'heading-three',
  'heading-four',
  'heading-five',
  'heading-six',
  'list-ordered',
  'list-unordered',
  'image',
  'quote',
  'code',
] as const;

type SelectorBlockKey = (typeof selectorBlockKeys)[number];

const isSelectorBlockKey = (key: unknown): key is SelectorBlockKey => {
  return typeof key === 'string' && selectorBlockKeys.includes(key as SelectorBlockKey);
};

type BlocksStore = {
  [K in SelectorBlockKey]: SelectorBlock;
} & {
  [K in NonSelectorBlockKey]: NonSelectorBlock;
};

interface BlocksEditorContextValue {
  blocks: BlocksStore;
  modifiers: ModifiersStore;
  disabled: boolean;
  name: string;
  setLiveText: (text: string) => void;
  isExpandedMode: boolean;
}

const [BlocksEditorProvider, usePartialBlocksEditorContext] =
  createContext<BlocksEditorContextValue>('BlocksEditor');

function useBlocksEditorContext(
  consumerName: string
): BlocksEditorContextValue & { editor: Editor } {
  const context = usePartialBlocksEditorContext(consumerName, (state) => state);
  const editor = useSlate();

  return {
    ...context,
    editor,
  };
}

/* -------------------------------------------------------------------------------------------------
 * BlocksEditor
 * -----------------------------------------------------------------------------------------------*/

const EditorDivider = styled(Divider)`
  background: ${({ theme }) => theme.colors.neutral200};
`;

/**
 * Forces an update of the Slate editor when the value prop changes from outside of Slate.
 * The root cause is that Slate is not a controlled component: https://github.com/ianstormtaylor/slate/issues/4612
 * Why not use JSON.stringify(value) as the key?
 * Because it would force a rerender of the entire editor every time the user types a character.
 * Why not use the entity id as the key, since it's unique for each locale?
 * Because it would not solve the problem when using the "fill in from other locale" feature
 */
function useResetKey(value?: Schema.Attribute.BlocksValue): {
  key: number;
  incrementSlateUpdatesCount: () => void;
} {
  // Keep track how many times Slate detected a change from a user interaction in the editor
  const slateUpdatesCount = React.useRef(0);
  // Keep track of how many times the value prop was updated, whether from within editor or from outside
  const valueUpdatesCount = React.useRef(0);
  // Use a key to force a rerender of the Slate editor when needed
  const [key, setKey] = React.useState(0);

  React.useEffect(() => {
    valueUpdatesCount.current += 1;

    // If the 2 refs are not equal, it means the value was updated from outside
    if (valueUpdatesCount.current !== slateUpdatesCount.current) {
      // So we change the key to force a rerender of the Slate editor,
      // which will pick up the new value through its initialValue prop
      setKey((previousKey) => previousKey + 1);

      // Then bring the 2 refs back in sync
      slateUpdatesCount.current = valueUpdatesCount.current;
    }
  }, [value]);

  const incrementSlateUpdatesCount = React.useCallback(() => {
    slateUpdatesCount.current += 1;
  }, []);

  return { key, incrementSlateUpdatesCount };
}

const pipe =
  (...fns: ((baseEditor: Editor) => Editor)[]) =>
  (value: Editor) =>
    fns.reduce<Editor>((prev, fn) => fn(prev), value);

/**
 * Normalize the blocks state to null if the editor state is considered empty,
 * otherwise return the state
 */
const normalizeBlocksState = (
  editor: Editor,
  value: Schema.Attribute.BlocksValue | Descendant[]
): Schema.Attribute.BlocksValue | Descendant[] | null => {
  const isEmpty =
    value.length === 1 && Editor.isEmpty(editor, value[0] as Schema.Attribute.BlocksNode);

  return isEmpty ? null : value;
};

interface BlocksEditorProps
  extends Pick<FieldValue<Schema.Attribute.BlocksValue>, 'onChange' | 'value' | 'error'>,
    BlocksContentProps {
  disabled?: boolean;
  name: string;
}

const BlocksEditor = React.forwardRef<{ focus: () => void }, BlocksEditorProps>(
  ({ disabled = false, name, onChange, value, error, ...contentProps }, forwardedRef) => {
    const { formatMessage } = useIntl();
    const isMobile = useIsMobile();

    const blocks = React.useMemo(
      () => ({
        ...paragraphBlocks,
        ...headingBlocks,
        ...listBlocks,
        ...linkBlocks,
        ...imageBlocks,
        ...quoteBlocks,
        ...codeBlocks,
      }),
      []
    ) satisfies BlocksStore;

    const blockRegisteredPlugins = Object.values(blocks)
      .map((block) => block.plugin)
      .filter(isNonNullable);

    const [editor] = React.useState(() =>
      pipe(withHistory, withStrapiSchema, withReact, ...blockRegisteredPlugins)(createEditor())
    );
    const [liveText, setLiveText] = React.useState('');
    const ariaDescriptionId = React.useId();
    const [isExpandedMode, handleToggleExpand] = React.useReducer((prev) => !prev, false);

    /**
     * Editable is not able to hold the ref, https://github.com/ianstormtaylor/slate/issues/4082
     * so with "useImperativeHandle" we can use ReactEditor methods to expose to the parent above
     * also not passing forwarded ref here, gives console warning.
     */
    React.useImperativeHandle(
      forwardedRef,
      () => ({
        focus() {
          ReactEditor.focus(editor);
        },
      }),
      [editor]
    );

    const { key, incrementSlateUpdatesCount } = useResetKey(value);

    const debounceTimeout = React.useRef<NodeJS.Timeout | null>(null);

    const handleSlateChange = React.useCallback(
      (state: Descendant[]) => {
        const isAstChange = editor.operations.some((op) => op.type !== 'set_selection');

        if (isAstChange) {
          /**
           * Slate handles the state of the editor internally. We just need to keep Strapi's form
           * state in sync with it in order to make sure that things like the "modified" state
           * isn't broken. Updating the whole state on every change is very expensive however,
           * so we debounce calls to onChange to mitigate input lag.
           */
          if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
          }

          // Set a new debounce timeout
          debounceTimeout.current = setTimeout(() => {
            incrementSlateUpdatesCount();

            // Normalize the state (empty editor becomes null)
            onChange(name, normalizeBlocksState(editor, state) as Schema.Attribute.BlocksValue);
            debounceTimeout.current = null;
          }, 300);
        }
      },
      [editor, incrementSlateUpdatesCount, name, onChange]
    );

    // Clean up the timeout on unmount
    React.useEffect(() => {
      return () => {
        if (debounceTimeout.current) {
          clearTimeout(debounceTimeout.current);
        }
      };
    }, []);

    // Ensure the editor is in sync after discard
    React.useEffect(() => {
      // Never deselect while the editor is actively focused (typing / editing),
      if (ReactEditor.isFocused(editor)) {
        return;
      }

      // Normalize empty states for comparison to avoid losing focus on the editor when content is deleted
      const normalizedValue = value?.length ? value : null;
      const normalizedEditorState = normalizeBlocksState(editor, editor.children);

      // Compare the field value with the editor state to check for a stale selection
      if (
        normalizedValue &&
        normalizedEditorState &&
        JSON.stringify(normalizedEditorState) !== JSON.stringify(normalizedValue)
      ) {
        // When there is a diff, unset selection to avoid an invalid state
        Transforms.deselect(editor);
      }
    }, [editor, value]);

    return (
      <>
        <VisuallyHidden id={ariaDescriptionId}>
          {formatMessage({
            id: getTranslation('components.Blocks.dnd.instruction'),
            defaultMessage: `To reorder blocks, press Command or Control along with Shift and the Up or Down arrow keys`,
          })}
        </VisuallyHidden>
        <VisuallyHidden aria-live="assertive">{liveText}</VisuallyHidden>
        <Slate
          editor={editor}
          initialValue={
            value?.length ? value : [{ type: 'paragraph', children: [{ type: 'text', text: '' }] }]
          }
          onChange={handleSlateChange}
          key={key}
        >
          <BlocksEditorProvider
            blocks={blocks}
            modifiers={modifiers}
            disabled={disabled}
            name={name}
            setLiveText={setLiveText}
            isExpandedMode={isExpandedMode}
          >
            <EditorLayout
              error={error}
              disabled={disabled}
              onToggleExpand={handleToggleExpand}
              ariaDescriptionId={ariaDescriptionId}
            >
              <BlocksToolbar />
              <EditorDivider width="100%" />
              <BlocksContent {...contentProps} />
              {!isExpandedMode && !isMobile && (
                <IconButton
                  position="absolute"
                  bottom="1.2rem"
                  right="1.2rem"
                  shadow="filterShadow"
                  label={formatMessage({
                    id: getTranslation('components.Blocks.expand'),
                    defaultMessage: 'Expand',
                  })}
                  onClick={handleToggleExpand}
                >
                  <Expand />
                </IconButton>
              )}
            </EditorLayout>
          </BlocksEditorProvider>
        </Slate>
      </>
    );
  }
);

export {
  type BlocksStore,
  type SelectorBlockKey,
  BlocksEditor,
  BlocksEditorProvider,
  useBlocksEditorContext,
  isSelectorBlockKey,
  normalizeBlocksState,
};
