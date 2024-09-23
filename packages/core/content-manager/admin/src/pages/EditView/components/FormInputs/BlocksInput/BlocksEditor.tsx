import * as React from 'react';

import { createContext, type FieldValue } from '@strapi/admin/strapi-admin';
import { IconButton, Divider, VisuallyHidden } from '@strapi/design-system';
import { Expand } from '@strapi/icons';
import { MessageDescriptor, useIntl } from 'react-intl';
import { Editor, type Descendant, createEditor } from 'slate';
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
import { withImages } from './plugins/withImages';
import { withLinks } from './plugins/withLinks';
import { withStrapiSchema } from './plugins/withStrapiSchema';

import type { Schema } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * BlocksEditorProvider
 * -----------------------------------------------------------------------------------------------*/

interface BaseBlock {
  renderElement: (props: RenderElementProps) => React.JSX.Element;
  matchNode: (node: Schema.Attribute.BlocksNode) => boolean;
  handleConvert?: (editor: Editor) => void | (() => React.JSX.Element);
  handleEnterKey?: (editor: Editor) => void;
  handleBackspaceKey?: (editor: Editor, event: React.KeyboardEvent<HTMLElement>) => void;
  handleTab?: (editor: Editor) => void;
  snippets?: string[];
  dragHandleTopMargin?: CSSProperties['marginTop'];
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

const ExpandIconButton = styled(IconButton)`
  position: absolute;
  bottom: 1.2rem;
  right: 1.2rem;
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

  return { key, incrementSlateUpdatesCount: () => (slateUpdatesCount.current += 1) };
}

const pipe =
  (...fns: ((baseEditor: Editor) => Editor)[]) =>
  (value: Editor) =>
    fns.reduce<Editor>((prev, fn) => fn(prev), value);

interface BlocksEditorProps
  extends Pick<FieldValue<Schema.Attribute.BlocksValue>, 'onChange' | 'value' | 'error'>,
    BlocksContentProps {
  disabled?: boolean;
  name: string;
}

const BlocksEditor = React.forwardRef<{ focus: () => void }, BlocksEditorProps>(
  ({ disabled = false, name, onChange, value, error, ...contentProps }, forwardedRef) => {
    const { formatMessage } = useIntl();
    const [editor] = React.useState(() =>
      pipe(withHistory, withImages, withStrapiSchema, withReact, withLinks)(createEditor())
    );
    const [liveText, setLiveText] = React.useState('');
    const ariaDescriptionId = React.useId();
    const [isExpandedMode, setIsExpandedMode] = React.useState(false);

    const handleToggleExpand = () => {
      setIsExpandedMode((prev) => !prev);
    };

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

    const handleSlateChange = (state: Descendant[]) => {
      const isAstChange = editor.operations.some((op) => op.type !== 'set_selection');

      if (isAstChange) {
        incrementSlateUpdatesCount();

        onChange(name, state as Schema.Attribute.BlocksValue);
      }
    };

    const blocks: BlocksStore = {
      ...paragraphBlocks,
      ...headingBlocks,
      ...listBlocks,
      ...linkBlocks,
      ...imageBlocks,
      ...quoteBlocks,
      ...codeBlocks,
    };

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
          initialValue={value || [{ type: 'paragraph', children: [{ type: 'text', text: '' }] }]}
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
              onCollapse={handleToggleExpand}
              ariaDescriptionId={ariaDescriptionId}
            >
              <BlocksToolbar />
              <EditorDivider width="100%" />
              <BlocksContent {...contentProps} />
              {!isExpandedMode && (
                <ExpandIconButton
                  label={formatMessage({
                    id: getTranslation('components.Blocks.expand'),
                    defaultMessage: 'Expand',
                  })}
                  onClick={handleToggleExpand}
                >
                  <Expand />
                </ExpandIconButton>
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
};
