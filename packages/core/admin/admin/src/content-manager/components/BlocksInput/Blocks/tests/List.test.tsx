/* eslint-disable testing-library/no-node-access */
import * as React from 'react';

import { render, screen } from '@testing-library/react';
import { Editor, Transforms, createEditor } from 'slate';
import { ReactEditor } from 'slate-react';

import { listBlocks } from '../List';

import { Wrapper } from './Wrapper';

const mockEvent = {
  preventDefault: jest.fn(),
  target: {
    value: '',
  },
};

describe('List', () => {
  it('renders an unordered list block properly', () => {
    render(
      listBlocks['list-unordered'].renderElement({
        children: 'list unordered',
        element: {
          type: 'list',
          children: [{ type: 'list-item', children: [{ type: 'text', text: 'list unordered' }] }],
          format: 'unordered',
        },
        attributes: {
          'data-slate-node': 'element',
          ref: null,
        },
      }),
      {
        wrapper: Wrapper,
      }
    );

    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();
  });

  it('renders an ordered list block properly', () => {
    render(
      listBlocks['list-ordered'].renderElement({
        children: 'list ordered',
        element: {
          type: 'list',
          children: [{ type: 'list-item', children: [{ type: 'text', text: 'list ordered' }] }],
          format: 'unordered',
        },
        attributes: {
          'data-slate-node': 'element',
          ref: null,
        },
      }),
      {
        wrapper: Wrapper,
      }
    );

    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();
  });

  it('renders a list item block properly', () => {
    render(
      listBlocks['list-item'].renderElement({
        children: 'list item',
        element: {
          type: 'list-item',
          children: [{ type: 'text', text: 'list item' }],
        },
        attributes: {
          'data-slate-node': 'element',
          ref: null,
        },
      }),
      {
        wrapper: Wrapper,
      }
    );

    const listItem = screen.getByRole('listitem');
    expect(listItem).toBeInTheDocument();
    expect(listItem).toHaveTextContent('list item');
  });

  it('handles enter key on a list item with text', () => {
    const baseEditor = createEditor();
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
    listBlocks['list-unordered'].handleEnterKey!(baseEditor);

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
    const baseEditor = createEditor();
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
    listBlocks['list-unordered'].handleEnterKey!(baseEditor);

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
    const baseEditor = createEditor();
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
    listBlocks['list-ordered'].handleEnterKey!(baseEditor);

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

  it('handles enter key on a nested empty list item', () => {
    const baseEditor = createEditor();
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
                text: 'item 1',
              },
            ],
          },
          {
            type: 'list',
            format: 'ordered',
            indentLevel: 1,
            children: [
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'one',
                  },
                ],
              },
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'two',
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
        ],
      },
    ];

    // Set the cursor on the nested empty list item
    Transforms.select(baseEditor, {
      anchor: { path: [0, 1, 2, 0], offset: 0 },
      focus: { path: [0, 1, 2, 0], offset: 0 },
    });

    // Simulate the enter key
    listBlocks['list-ordered'].handleEnterKey!(baseEditor);

    // Should go back to the parent list just above and create new list item there
    expect(baseEditor.children).toEqual([
      {
        type: 'list',
        format: 'ordered',
        children: [
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'item 1',
              },
            ],
          },
          {
            type: 'list',
            format: 'ordered',
            indentLevel: 1,
            children: [
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'one',
                  },
                ],
              },
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'two',
                  },
                ],
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

    // Set the cursor on the empty list item created
    Transforms.select(baseEditor, {
      anchor: { path: [0, 2, 0], offset: 0 },
      focus: { path: [0, 2, 0], offset: 0 },
    });

    // Simulate the enter key
    listBlocks['list-ordered'].handleEnterKey!(baseEditor);

    // Should remove the empty list and create a paragraph instead
    expect(baseEditor.children).toEqual([
      {
        type: 'list',
        format: 'ordered',
        children: [
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'item 1',
              },
            ],
          },
          {
            type: 'list',
            format: 'ordered',
            indentLevel: 1,
            children: [
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'one',
                  },
                ],
              },
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'two',
                  },
                ],
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

  it('handles the backspace key on a very first list with single empty list item', () => {
    const baseEditor = createEditor();
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
    listBlocks['list-unordered'].handleBackspaceKey?.(
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
    const baseEditor = createEditor();
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
    listBlocks['list-ordered'].handleBackspaceKey?.(
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
    const baseEditor = createEditor();
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
    listBlocks['list-ordered'].handleBackspaceKey?.(
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
    const baseEditor = createEditor();
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
    listBlocks['list-ordered'].handleBackspaceKey?.(
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
    const baseEditor = createEditor();
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
    listBlocks['list-unordered'].handleBackspaceKey?.(
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
    listBlocks['list-unordered'].handleBackspaceKey?.(
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

  it('handles the backspace key on a nested list and merge list items at same level', () => {
    const baseEditor = createEditor();
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
                text: 'item 1',
              },
            ],
          },
          {
            type: 'list',
            format: 'ordered',
            indentLevel: 1,
            children: [
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'one',
                  },
                ],
              },
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'two',
                  },
                ],
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
          {
            type: 'list',
            format: 'ordered',
            indentLevel: 1,
            children: [
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'three',
                  },
                ],
              },
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'four',
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    // Set the cursor on the second list item of parent list
    Transforms.select(baseEditor, {
      anchor: { path: [0, 2, 0], offset: 0 },
      focus: { path: [0, 2, 0], offset: 0 },
    });

    // Simulate the backspace key
    listBlocks['list-ordered'].handleBackspaceKey?.(
      baseEditor,
      mockEvent as unknown as React.KeyboardEvent<HTMLDivElement>
    );

    // Should merge both list items at indentLevel 1
    expect(baseEditor.children).toEqual([
      {
        type: 'list',
        format: 'ordered',
        children: [
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'item 1',
              },
            ],
          },
          {
            type: 'list',
            format: 'ordered',
            indentLevel: 1,
            children: [
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'one',
                  },
                ],
              },
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'two',
                  },
                ],
              },
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'three',
                  },
                ],
              },
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'four',
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
  });

  it('handles the tab on a simple list and creates a nested list', () => {
    const baseEditor = createEditor();
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
                text: 'Second list item',
              },
            ],
          },
        ],
      },
    ];

    // Set the cursor at the first list item
    Transforms.select(baseEditor, {
      anchor: Editor.end(baseEditor, [0, 0]),
      focus: Editor.end(baseEditor, [0, 0]),
    });

    // Simulate the enter key
    listBlocks['list-unordered'].handleTab!(baseEditor);

    // Should do nothing as tabbing works from second list item
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
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'Second list item',
              },
            ],
          },
        ],
      },
    ]);

    // Set the cursor at the end of the last list item
    Transforms.select(baseEditor, {
      anchor: Editor.end(baseEditor, [0, 1]),
      focus: Editor.end(baseEditor, [0, 1]),
    });

    // Simulate the enter key
    listBlocks['list-unordered'].handleTab!(baseEditor);

    // Should convert second list item to nested list
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
          {
            type: 'list',
            format: 'unordered',
            indentLevel: 1,
            children: [
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'Second list item',
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
  });

  it('handles the tab on a nested item and merge item into nested list', () => {
    const baseEditor = createEditor();
    ReactEditor.findPath = jest.fn().mockReturnValue([0, 1]);

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
                text: 'First list',
              },
            ],
          },
          {
            type: 'list',
            format: 'ordered',
            indentLevel: 1,
            children: [
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'one',
                  },
                ],
              },
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'two',
                  },
                ],
              },
            ],
          },
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'Second list',
              },
            ],
          },
          {
            type: 'list',
            format: 'ordered',
            indentLevel: 1,
            children: [
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'three',
                  },
                ],
              },
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'four',
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    // Set the cursor at the first list item
    Transforms.select(baseEditor, {
      anchor: Editor.end(baseEditor, [0, 2, 0]),
      focus: Editor.end(baseEditor, [0, 2, 0]),
    });

    // Simulate the enter key
    listBlocks['list-ordered'].handleTab!(baseEditor);

    // Should do nothing as tabbing works from second list item
    expect(baseEditor.children).toEqual([
      {
        type: 'list',
        format: 'ordered',
        children: [
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'First list',
              },
            ],
          },
          {
            type: 'list',
            format: 'ordered',
            indentLevel: 1,
            children: [
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'one',
                  },
                ],
              },
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'two',
                  },
                ],
              },
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'Second list',
                  },
                ],
              },
            ],
          },
          {
            type: 'list',
            format: 'ordered',
            indentLevel: 1,
            children: [
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'three',
                  },
                ],
              },
              {
                type: 'list-item',
                children: [
                  {
                    type: 'text',
                    text: 'four',
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
  });

  it('has no modifiers applied when pressing enter at the end of a list item', () => {
    const baseEditor = createEditor();
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
    listBlocks['list-unordered'].handleEnterKey!(baseEditor);

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

  // TODO: test list conversion.
  // check out the commented code in BlocksToolbar to see what we're missing
  it('converts a paragraph to a list', () => {
    const baseEditor = createEditor();
    baseEditor.children = [
      {
        type: 'heading',
        level: 1,
        children: [
          {
            type: 'text',
            text: 'Heading link',
          },
        ],
      },
    ];

    // Set the cursor on the heading
    Transforms.select(baseEditor, {
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 0 },
    });

    listBlocks['list-ordered'].handleConvert!(baseEditor);

    expect(baseEditor.children).toEqual([
      {
        type: 'list',
        format: 'ordered',
        children: [
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'Heading link',
              },
            ],
          },
        ],
      },
    ]);
  });

  it('converts a heading with a link to a list', () => {
    const baseEditor = createEditor();
    baseEditor.children = [
      {
        type: 'heading',
        level: 1,
        children: [
          {
            type: 'link',
            url: 'https://strapi.io',
            children: [
              {
                type: 'text',
                text: 'Heading link',
              },
            ],
          },
        ],
      },
    ];

    // Set the cursor on the heading
    Transforms.select(baseEditor, {
      anchor: { path: [0, 0, 0], offset: 0 },
      focus: { path: [0, 0, 0], offset: 0 },
    });

    listBlocks['list-ordered'].handleConvert!(baseEditor);

    expect(baseEditor.children).toEqual([
      {
        type: 'list',
        format: 'ordered',
        children: [
          {
            type: 'list-item',
            children: [
              {
                type: 'link',
                url: 'https://strapi.io',
                children: [
                  {
                    type: 'text',
                    text: 'Heading link',
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
  });
});
