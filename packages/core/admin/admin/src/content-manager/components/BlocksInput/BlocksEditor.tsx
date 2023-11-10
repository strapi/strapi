import * as React from 'react';

import { createContext } from '@radix-ui/react-context';
import { InputWrapper, Divider } from '@strapi/design-system';
import { type Attribute } from '@strapi/types';
import { MessageDescriptor, useIntl } from 'react-intl';
import { type Editor, type Descendant, createEditor } from 'slate';
import { withHistory } from 'slate-history';
import { Slate, withReact, ReactEditor, useSlate } from 'slate-react';
import styled from 'styled-components';

import { BlocksContent } from './BlocksContent';
import { BlocksToolbar } from './BlocksToolbar';
import { withLinks } from './plugins/withLinks';
import { withStrapiSchema } from './plugins/withStrapiSchema';

/* -------------------------------------------------------------------------------------------------
 * BlocksEditorProvider
 * -----------------------------------------------------------------------------------------------*/

interface BlocksEditorContextValue {
  disabled: boolean;
}

const [BlocksEditorProvider, usePartialBlocksEditorContext] =
  createContext<BlocksEditorContextValue>('BlocksEditor');

function useBlocksEditorContext(
  consumerName: string
): BlocksEditorContextValue & { editor: Editor } {
  const context = usePartialBlocksEditorContext(consumerName);
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
function useResetKey(value?: Attribute.BlocksValue): {
  key: number;
  incrementSlateUpdatesCount: () => void;
} {
  // Keep track how how many times Slate detected a change from a user interaction in the editor
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

/**
 * Images are void elements. They handle the rendering of their children instead of Slate.
 * See the Slate documentation for more information:
 * - https://docs.slatejs.org/api/nodes/element#void-vs-not-void
 * - https://docs.slatejs.org/api/nodes/element#rendering-void-elements
 */
const withImages = (editor: Editor) => {
  const { isVoid } = editor;

  editor.isVoid = (element) => {
    return element.type === 'image' ? true : isVoid(element);
  };

  return editor;
};

const pipe =
  (...fns: ((baseEditor: Editor) => Editor)[]) =>
  (value: Editor) =>
    fns.reduce<Editor>((prev, fn) => fn(prev), value);

interface BlocksEditorProps {
  name: string;
  onChange: (event: {
    target: { name: string; value: Attribute.BlocksValue; type: 'blocks' };
  }) => void;
  disabled?: boolean;
  value?: Attribute.BlocksValue;
  placeholder?: MessageDescriptor;
  error?: string;
}

const BlocksEditor = React.forwardRef<{ focus: () => void }, BlocksEditorProps>(
  ({ disabled = false, name, placeholder, onChange, value, error }, forwardedRef) => {
    const { formatMessage } = useIntl();

    const [editor] = React.useState(() =>
      pipe(withHistory, withImages, withStrapiSchema, withReact, withLinks)(createEditor())
    );
    const formattedPlaceholder =
      placeholder &&
      formatMessage({ id: placeholder.id, defaultMessage: placeholder.defaultMessage });

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

        onChange({
          // Casting is needed because Slate's onChange type doesn't take into consideration
          // that we set Editor['children'] to Attribute.BlocksValue in custom.d.ts
          target: { name, value: state as Attribute.BlocksValue, type: 'blocks' },
        });
      }
    };

    return (
      <Slate
        editor={editor}
        initialValue={value || [{ type: 'paragraph', children: [{ type: 'text', text: '' }] }]}
        onChange={handleSlateChange}
        key={key}
      >
        <BlocksEditorProvider disabled={disabled}>
          <InputWrapper
            direction="column"
            alignItems="flex-start"
            height="512px"
            disabled={disabled}
            hasError={Boolean(error)}
            style={{ overflow: 'hidden' }}
          >
            <BlocksToolbar />
            <EditorDivider width="100%" />
            <BlocksContent placeholder={formattedPlaceholder} />
          </InputWrapper>
        </BlocksEditorProvider>
      </Slate>
    );
  }
);

export { BlocksEditor, BlocksEditorProvider, useBlocksEditorContext };
