import * as React from 'react';

import { useStrapiApp, type FieldValue, useIsMobile } from '@strapi/admin/strapi-admin';
import { IconButton, Divider, VisuallyHidden } from '@strapi/design-system';
import { Expand } from '@strapi/icons';
import { flushSync } from 'react-dom';
import { useIntl } from 'react-intl';
import { Editor, type Descendant, createEditor, Transforms } from 'slate';
import { withHistory } from 'slate-history';
import { Slate, withReact, ReactEditor } from 'slate-react';
import { styled } from 'styled-components';

import { ContentManagerPlugin } from '../../../../../content-manager';
import { getTranslation } from '../../../../../utils/translations';

import { BlocksContent, type BlocksContentProps } from './BlocksContent';
import {
  BlocksEditorProvider,
  normalizeBlocksState,
  type RichTextBlocksStore,
} from './BlocksEditorContext';
import { BlocksToolbar } from './BlocksToolbar';
import { EditorLayout } from './EditorLayout';
import { modifiers } from './Modifiers';
import { withStrapiSchema } from './plugins/withStrapiSchema';
import { isNonNullable } from './utils/types';

import type { Schema } from '@strapi/types';

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

    const blocks = useStrapiApp(
      'BlocksEditor',
      (state) =>
        (
          state.plugins['content-manager']?.apis as
            | ContentManagerPlugin['config']['apis']
            | undefined
        )?.getRichTextBlocks() ?? ({} as RichTextBlocksStore)
    );

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

    const flushPendingFormSync = React.useCallback(() => {
      if (!debounceTimeout.current) {
        return;
      }
      clearTimeout(debounceTimeout.current);
      debounceTimeout.current = null;
      incrementSlateUpdatesCount();
      // Ensure Strapi Form state updates before the next event (e.g. Save click) reads values.
      flushSync(() => {
        onChange(
          name,
          normalizeBlocksState(editor, editor.children) as Schema.Attribute.BlocksValue
        );
      });
    }, [editor, incrementSlateUpdatesCount, name, onChange]);

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
            flushPendingFormSync={flushPendingFormSync}
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

export { BlocksEditor };
export {
  type BlocksStore,
  type RichTextBlocksStore,
  type SelectorBlockKey,
  type SelectorBlock,
  type NonSelectorBlock,
  BlocksEditorProvider,
  useBlocksEditorContext,
  isSelectorBlockKey,
  normalizeBlocksState,
} from './BlocksEditorContext';
