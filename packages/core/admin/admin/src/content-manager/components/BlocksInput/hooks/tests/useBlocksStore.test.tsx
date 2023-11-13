/* eslint-disable testing-library/no-node-access */
/* eslint-disable check-file/filename-naming-convention */

import * as React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { type Attribute } from '@strapi/types';
import { render, screen, renderHook, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { createEditor, Editor, Transforms } from 'slate';
import { Slate, withReact, ReactEditor } from 'slate-react';

import { BlocksEditorProvider } from '../../BlocksEditor';
import { withLinks } from '../../plugins/withLinks';
import { type Block } from '../../utils/types';
import { useBlocksStore } from '../useBlocksStore';

const initialValue: Attribute.BlocksValue = [
  {
    type: 'paragraph',
    children: [{ type: 'text', text: 'A line of text in a paragraph.' }],
  },
];

const mockEvent = {
  preventDefault: jest.fn(),
  target: {
    value: '',
  },
};
const user = userEvent.setup();

const baseEditor = createEditor();

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const [editor] = React.useState(() => withReact(withLinks(baseEditor)));

  return (
    <ThemeProvider theme={lightTheme}>
      <IntlProvider messages={{}} locale="en">
        <Slate initialValue={initialValue} editor={editor}>
          <BlocksEditorProvider>{children}</BlocksEditorProvider>
        </Slate>
      </IntlProvider>
    </ThemeProvider>
  );
};

describe('useBlocksStore', () => {
  beforeEach(() => {
    // ESLint thinks we're manipulating the dom, when we're actually manipulating the editor
    baseEditor.children = initialValue;

    /**
     * @TODO: We need to find a way to use the actual implementation
     * This problem is also present at Toolbar tests
     */
    ReactEditor.findPath = jest.fn();
    ReactEditor.focus = jest.fn();
  });

  it('handles enter key on paragraph block', () => {
    // Don't use Wrapper since we don't test any React logic or rendering
    // Wrapper cause issues about updates not wrapped in act()
    const { result } = renderHook(useBlocksStore);

    baseEditor.children = [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'Line of text',
          },
          {
            type: 'text',
            text: ' with modifiers too',
            bold: true,
          },
        ],
      },
    ];

    // Set the cursor after "Line of"
    Transforms.select(baseEditor, {
      /**
       * Docs about anchor and focus: https://docs.slatejs.org/v/v0.47/slate-core/range
       * In this case they are the same because no text is selected,
       * we're only setting the position of the cursor.
       */
      anchor: Editor.point(baseEditor, { path: [0, 0], offset: 7 }),
      focus: Editor.point(baseEditor, { path: [0, 0], offset: 7 }),
    });

    // Simulate the enter key
    result.current.paragraph.handleEnterKey?.(baseEditor);

    // Should insert a new paragraph with the content after the cursor
    expect(baseEditor.children).toEqual([
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'Line of',
          },
        ],
      },
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: ' text',
          },
          {
            type: 'text',
            text: ' with modifiers too',
            bold: true,
          },
        ],
      },
    ]);
  });

  it('handles enter key on code block', () => {
    // Don't use Wrapper since we don't test any React logic or rendering
    // Wrapper cause issues about updates not wrapped in act()
    const { result } = renderHook(useBlocksStore);

    baseEditor.children = [
      {
        type: 'code',
        children: [
          {
            type: 'text',
            text: 'Line of code',
          },
        ],
      },
    ];

    // Set the cursor at the end of the fast list item
    Transforms.select(baseEditor, {
      anchor: Editor.end(baseEditor, []),
      focus: Editor.end(baseEditor, []),
    });

    // Simulate the enter key
    result.current.code.handleEnterKey?.(baseEditor);

    // Should insert a newline within the code block (shoudn't exit the code block)
    expect(baseEditor.children).toEqual([
      {
        type: 'code',
        children: [
          {
            type: 'text',
            text: 'Line of code\n',
          },
        ],
      },
    ]);
  });

  it('handles enter key on a list item with text', () => {
    // Don't use Wrapper since we don't test any React logic or rendering
    // Wrapper cause issues about updates not wrapped in act()
    const { result } = renderHook(useBlocksStore);

    baseEditor.children = [
      {
        type: 'list',
        format: 'unordered',
        children: [
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'Line of text',
              },
            ],
          },
        ],
      },
    ];

    // Set the cursor at the end of the first list item
    Transforms.select(baseEditor, {
      anchor: Editor.end(baseEditor, []),
      focus: Editor.end(baseEditor, []),
    });

    // Simulate the enter key
    result.current['list-unordered'].handleEnterKey?.(baseEditor);

    // Should insert a new list item
    expect(baseEditor.children).toEqual([
      {
        type: 'list',
        format: 'unordered',
        children: [
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'Line of text',
              },
            ],
          },
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: '',
              },
            ],
          },
        ],
      },
    ]);
  });

  it('handles enter key on a list item without text', () => {
    const { result } = renderHook(useBlocksStore);

    baseEditor.children = [
      {
        type: 'list',
        format: 'unordered',
        children: [
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'First list item',
              },
            ],
          },
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: '',
              },
            ],
          },
        ],
      },
    ];

    // Set the cursor at the end of the last list item
    Transforms.select(baseEditor, {
      anchor: Editor.end(baseEditor, [0, 1]),
      focus: Editor.end(baseEditor, [0, 1]),
    });

    // Simulate the enter key
    result.current['list-unordered'].handleEnterKey?.(baseEditor);

    // Should remove the empty list item and create a paragraph after the list
    expect(baseEditor.children).toEqual([
      {
        type: 'list',
        format: 'unordered',
        children: [
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'First list item',
              },
            ],
          },
        ],
      },
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: '',
          },
        ],
      },
    ]);
  });

  it('handles enter key on an empty list', () => {
    const { result } = renderHook(useBlocksStore);

    baseEditor.children = [
      {
        type: 'list',
        format: 'ordered',
        children: [
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: '',
              },
            ],
          },
        ],
      },
    ];

    // Set the cursor on the first list item
    Transforms.select(baseEditor, {
      anchor: { path: [0, 0, 0], offset: 0 },
      focus: { path: [0, 0, 0], offset: 0 },
    });

    // Simulate the enter key
    result.current['list-ordered'].handleEnterKey?.(baseEditor);

    // Should remove the empty list and create a paragraph instead
    expect(baseEditor.children).toEqual([
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: '',
          },
        ],
      },
    ]);
  });

  it('handles the backspace key on a very first list with single empty list item', () => {
    const { result } = renderHook(useBlocksStore);

    baseEditor.children = [
      {
        type: 'list',
        format: 'unordered',
        children: [
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: '',
              },
            ],
          },
        ],
      },
    ];

    // Set the cursor on the first list item
    Transforms.select(baseEditor, {
      anchor: { path: [0, 0, 0], offset: 0 },
      focus: { path: [0, 0, 0], offset: 0 },
    });

    // Simulate the backspace key
    result.current['list-unordered'].handleBackspaceKey?.(
      baseEditor,
      mockEvent as unknown as React.KeyboardEvent<HTMLDivElement>
    );

    // Should remove the empty list item and replace with empty paragraph
    expect(baseEditor.children).toEqual([
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: '',
          },
        ],
      },
    ]);
  });

  it('handles the backspace key on a list with single empty list item', () => {
    const { result } = renderHook(useBlocksStore);

    baseEditor.children = [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'some text',
          },
        ],
      },
      {
        type: 'list',
        format: 'ordered',
        children: [
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: '',
              },
            ],
          },
        ],
      },
    ];

    // Set the cursor on the first list item
    Transforms.select(baseEditor, {
      anchor: { path: [1, 0, 0], offset: 0 },
      focus: { path: [1, 0, 0], offset: 0 },
    });

    // Simulate the backspace key
    result.current['list-ordered'].handleBackspaceKey?.(
      baseEditor,
      mockEvent as unknown as React.KeyboardEvent<HTMLDivElement>
    );

    // Should remove the empty list item
    expect(baseEditor.children).toEqual([
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'some text',
          },
        ],
      },
    ]);
  });

  it('handles the backspace key on a list with two list items and converts the first into a paragraph', () => {
    const { result } = renderHook(useBlocksStore);

    baseEditor.children = [
      {
        type: 'list',
        format: 'ordered',
        children: [
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'first list item',
              },
            ],
          },
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'second list item',
              },
            ],
          },
        ],
      },
    ];

    // Set the cursor on the first list item
    Transforms.select(baseEditor, {
      anchor: { path: [0, 0, 0], offset: 0 },
      focus: { path: [0, 0, 0], offset: 0 },
    });

    // Simulate the backspace key
    result.current['list-ordered'].handleBackspaceKey?.(
      baseEditor,
      mockEvent as unknown as React.KeyboardEvent<HTMLDivElement>
    );

    // Should convert the first list item in a paragraph
    expect(baseEditor.children).toEqual([
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'first list item',
          },
        ],
      },
      {
        type: 'list',
        format: 'ordered',
        children: [
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'second list item',
              },
            ],
          },
        ],
      },
    ]);
  });

  it('handles the backspace key on a empty list with just one list item', () => {
    const { result } = renderHook(useBlocksStore);

    baseEditor.children = [
      {
        type: 'list',
        format: 'ordered',
        children: [
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: '',
              },
            ],
          },
        ],
      },
    ];

    // Set the cursor on the first list item
    Transforms.select(baseEditor, {
      anchor: { path: [0, 0, 0], offset: 0 },
      focus: { path: [0, 0, 0], offset: 0 },
    });

    // Simulate the backspace key
    result.current['list-ordered'].handleBackspaceKey?.(
      baseEditor,
      mockEvent as unknown as React.KeyboardEvent<HTMLDivElement>
    );

    // Should convert the first list item in a paragraph
    expect(baseEditor.children).toEqual([
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: '',
          },
        ],
      },
    ]);
  });

  it('handles the backspace key on a list with mixed content', () => {
    const { result } = renderHook(useBlocksStore);

    baseEditor.children = [
      {
        type: 'list',
        format: 'unordered',
        children: [
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'text',
              },
            ],
          },
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'bold',
                bold: true,
              },
            ],
          },
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'italic',
                italic: true,
              },
            ],
          },
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'mixed ',
              },
              {
                type: 'text',
                text: 'text',
                underline: true,
              },
            ],
          },
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'inline ',
              },
              {
                type: 'text',
                text: 'code',
                code: true,
              },
            ],
          },
        ],
      },
    ];

    // Set the cursor on the first list item
    Transforms.select(baseEditor, {
      anchor: { path: [0, 0, 0], offset: 0 },
      focus: { path: [0, 0, 0], offset: 0 },
    });

    // Simulate the backspace key
    result.current['list-unordered'].handleBackspaceKey?.(
      baseEditor,
      mockEvent as unknown as React.KeyboardEvent<HTMLDivElement>
    );

    // Should convert the first list item in a paragraph
    expect(baseEditor.children).toEqual([
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'text',
          },
        ],
      },
      {
        type: 'list',
        format: 'unordered',
        children: [
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'bold',
                bold: true,
              },
            ],
          },
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'italic',
                italic: true,
              },
            ],
          },
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'mixed ',
              },
              {
                type: 'text',
                text: 'text',
                underline: true,
              },
            ],
          },
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'inline ',
              },
              {
                type: 'text',
                text: 'code',
                code: true,
              },
            ],
          },
        ],
      },
    ]);

    // Set the cursor on the new first list item
    Transforms.select(baseEditor, {
      anchor: { path: [1, 0, 0], offset: 0 },
      focus: { path: [1, 0, 0], offset: 0 },
    });

    // Simulate the backspace key
    result.current['list-unordered'].handleBackspaceKey?.(
      baseEditor,
      mockEvent as unknown as React.KeyboardEvent<HTMLDivElement>
    );

    // Should convert the first list item in a paragraph
    expect(baseEditor.children).toEqual([
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'text',
          },
        ],
      },
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'bold',
            bold: true,
          },
        ],
      },
      {
        type: 'list',
        format: 'unordered',
        children: [
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'italic',
                italic: true,
              },
            ],
          },
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'mixed ',
              },
              {
                type: 'text',
                text: 'text',
                underline: true,
              },
            ],
          },
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'inline ',
              },
              {
                type: 'text',
                text: 'code',
                code: true,
              },
            ],
          },
        ],
      },
    ]);
  });

  it('handles enter key on a quote', () => {
    const { result } = renderHook(useBlocksStore);

    baseEditor.children = [
      {
        type: 'quote',
        children: [
          {
            type: 'text',
            text: 'Some quote',
          },
        ],
      },
    ];

    // Simulate enter key press at the end of the quote
    Transforms.select(baseEditor, {
      anchor: Editor.end(baseEditor, []),
      focus: Editor.end(baseEditor, []),
    });
    result.current.quote.handleEnterKey?.(baseEditor);

    // Should enter a line break within the quote
    expect(baseEditor.children).toEqual([
      {
        type: 'quote',
        children: [
          {
            type: 'text',
            text: 'Some quote\n',
          },
        ],
      },
    ]);

    // Simulate enter key press at the end of the quote again
    Transforms.select(baseEditor, {
      anchor: Editor.end(baseEditor, []),
      focus: Editor.end(baseEditor, []),
    });
    result.current.quote.handleEnterKey?.(baseEditor);

    // Should delete the line break and create a paragraph after the quote
    expect(baseEditor.children).toEqual([
      {
        type: 'quote',
        children: [
          {
            type: 'text',
            text: 'Some quote',
          },
        ],
      },
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: '',
          },
        ],
      },
    ]);
  });

  it('handles enter key called twice on paragraph block', () => {
    const { result } = renderHook(useBlocksStore);

    baseEditor.children = [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'Line of text',
          },
          {
            type: 'text',
            text: ' with modifiers too',
            bold: true,
          },
        ],
      },
    ];

    // Set the cursor after "Line of"
    Transforms.select(baseEditor, {
      anchor: { path: [0, 0], offset: 7 },
      focus: { path: [0, 0], offset: 7 },
    });

    if (!baseEditor.selection) {
      throw new Error('selection is not defined');
    }

    const cursorInitialPosition = baseEditor.selection.anchor.path;
    // Simulate the enter key
    result.current.paragraph.handleEnterKey?.(baseEditor);

    const cursorPositionAfterFirstEnter = baseEditor.selection.anchor.path;

    // Check if the cursor is positioned in the new line
    expect(cursorPositionAfterFirstEnter[0]).toEqual(cursorInitialPosition[0] + 1);

    // Set the cursor after "Line of"
    Transforms.select(baseEditor, {
      anchor: { path: [0, 0], offset: 7 },
      focus: { path: [0, 0], offset: 7 },
    });

    // Simulate another the enter key
    result.current.paragraph.handleEnterKey?.(baseEditor);

    const cursorPositionAfterSecondEnter = baseEditor.selection.anchor.path;

    // Check if the cursor is positioned in the new line
    expect(cursorPositionAfterSecondEnter[0]).toEqual(cursorInitialPosition[0] + 1);
  });

  it('disables modifiers when creating a new node with enter key in a paragraph', () => {
    const { result } = renderHook(useBlocksStore);

    baseEditor.children = [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'Line of text with modifiers',
            bold: true,
            italic: true,
          },
        ],
      },
    ];

    // Set the cursor at the end of the block with modifiers
    Transforms.select(baseEditor, {
      anchor: Editor.end(baseEditor, []),
      focus: Editor.end(baseEditor, []),
    });

    // Simulate the enter key
    result.current.paragraph.handleEnterKey?.(baseEditor);

    // Should insert a new paragraph without modifiers
    expect(baseEditor.children).toEqual([
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'Line of text with modifiers',
            bold: true,
            italic: true,
          },
        ],
      },
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: '',
          },
        ],
      },
    ]);
  });

  it('disables modifiers when creating a new node with enter key in a list item', () => {
    const { result } = renderHook(useBlocksStore);

    baseEditor.children = [
      {
        type: 'list',
        format: 'unordered',
        children: [
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'Line of text with modifiers',
                bold: true,
                italic: true,
              },
            ],
          },
        ],
      },
    ];

    // Set the cursor at the end of the block with modifiers
    Transforms.select(baseEditor, {
      anchor: Editor.end(baseEditor, []),
      focus: Editor.end(baseEditor, []),
    });

    // Simulate the enter key
    result.current['list-unordered'].handleEnterKey?.(baseEditor);

    // Should insert a new list item without modifiers
    expect(baseEditor.children).toEqual([
      {
        type: 'list',
        format: 'unordered',
        children: [
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'Line of text with modifiers',
                bold: true,
                italic: true,
              },
            ],
          },
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: '',
              },
            ],
          },
        ],
      },
    ]);
  });

  it('keeps modifiers when creating a new line in the middle of a paragraph with modifiers', () => {
    const { result } = renderHook(useBlocksStore);

    baseEditor.children = [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'Line of text with modifiers',
            bold: true,
            code: true,
            italic: true,
          },
        ],
      },
    ];

    // Set the cursor at the middle of the block with modifiers
    Transforms.select(baseEditor, {
      anchor: Editor.point(baseEditor, { path: [0, 0], offset: 10 }),
      focus: Editor.point(baseEditor, { path: [0, 0], offset: 10 }),
    });

    // Simulate the enter key
    result.current.paragraph.handleEnterKey?.(baseEditor);

    // Should insert a new line with modifiers
    expect(baseEditor.children).toEqual([
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'Line of te',
            bold: true,
            code: true,
            italic: true,
          },
        ],
      },
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'xt with modifiers',
            bold: true,
            code: true,
            italic: true,
          },
        ],
      },
    ]);
  });

  it('disables modifiers when creating a new node with enter key at the end of a quote', () => {
    const { result } = renderHook(useBlocksStore);

    baseEditor.children = [
      {
        type: 'quote',
        children: [
          {
            type: 'text',
            text: 'Some quote',
            bold: true,
            italic: true,
          },
        ],
      },
    ];

    Transforms.select(baseEditor, {
      anchor: Editor.end(baseEditor, []),
      focus: Editor.end(baseEditor, []),
    });

    // Bold and italic should be enabled
    expect(Editor.marks(baseEditor)).toEqual({ bold: true, italic: true, type: 'text' });

    // Simulate the enter key then user typing
    result.current.quote.handleEnterKey?.(baseEditor);

    // Once on the new line, bold and italic should be disabled
    expect(Editor.marks(baseEditor)).toEqual({ type: 'text' });
  });
});
