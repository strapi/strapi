import * as React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render, screen, renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PropTypes from 'prop-types';
import { IntlProvider } from 'react-intl';
import { createEditor, Editor, Transforms } from 'slate';
import { Slate, withReact, ReactEditor } from 'slate-react';

import { withLinks } from '../../plugins/withLinks';
import { useBlocksStore } from '../useBlocksStore';

const initialValue = [
  {
    type: 'paragraph',
    children: [{ text: 'A line of text in a paragraph.' }],
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

const Wrapper = ({ children }) => {
  const [editor] = React.useState(() => withReact(withLinks(baseEditor)));

  return (
    <ThemeProvider theme={lightTheme}>
      <IntlProvider messages={{}} locale="en">
        <Slate initialValue={initialValue} editor={editor}>
          {children}
        </Slate>
      </IntlProvider>
    </ThemeProvider>
  );
};

Wrapper.propTypes = {
  children: PropTypes.node.isRequired,
};

describe('useBlocksStore', () => {
  beforeEach(() => {
    baseEditor.children = initialValue;
    /**
     * @TODO: We need to find a way to use the actual implementation
     * This problem is also present at Toolbar tests
     */
    ReactEditor.findPath = jest.fn();
    ReactEditor.focus = jest.fn();
  });

  it('should return a store of blocks', () => {
    const { result } = renderHook(useBlocksStore, { wrapper: Wrapper });

    const storeKeys = Object.keys(result.current);
    expect(storeKeys).toContain('paragraph');
    expect(storeKeys).toContain('heading-one');
    expect(storeKeys).toContain('heading-six');
    expect(storeKeys).toContain('heading-three');
    expect(storeKeys).toContain('heading-four');
    expect(storeKeys).toContain('heading-five');
    expect(storeKeys).toContain('heading-six');
    expect(storeKeys).toContain('link');
    expect(storeKeys).toContain('code');
    expect(storeKeys).toContain('quote');
    expect(storeKeys).toContain('list-ordered');
    expect(storeKeys).toContain('list-unordered');
    expect(storeKeys).toContain('list-item');
    expect(storeKeys).toContain('image');

    Object.values(result.current).forEach((block) => {
      expect(block).toHaveProperty('value.type');
      expect(block).toHaveProperty('renderElement');
      expect(block).toHaveProperty('matchNode');
      expect(block).toHaveProperty('isInBlocksSelector');
    });
  });

  it('should match the right node type', () => {
    const { result } = renderHook(useBlocksStore, { wrapper: Wrapper });

    const paragraphNode = { type: 'paragraph' };
    const headingOneNode = { type: 'heading', level: 1 };
    const headingSixNode = { type: 'heading', level: 6 };
    const linkNode = { type: 'link' };
    const codeNode = { type: 'code' };
    const quoteNode = { type: 'quote' };
    const orderedListNode = { type: 'list', format: 'ordered' };
    const unorderedListNode = { type: 'list', format: 'unordered' };
    const listItemNode = { type: 'list-item' };
    const imageNode = { type: 'image' };

    expect(result.current.paragraph.matchNode(paragraphNode)).toBe(true);
    expect(result.current.paragraph.matchNode(headingOneNode)).toBe(false);
    expect(result.current.paragraph.matchNode(headingSixNode)).toBe(false);
    expect(result.current.paragraph.matchNode(linkNode)).toBe(false);
    expect(result.current.paragraph.matchNode(codeNode)).toBe(false);
    expect(result.current.paragraph.matchNode(quoteNode)).toBe(false);
    expect(result.current.paragraph.matchNode(orderedListNode)).toBe(false);
    expect(result.current.paragraph.matchNode(unorderedListNode)).toBe(false);
    expect(result.current.paragraph.matchNode(listItemNode)).toBe(false);
    expect(result.current.paragraph.matchNode(imageNode)).toBe(false);

    expect(result.current['heading-one'].matchNode(paragraphNode)).toBe(false);
    expect(result.current['heading-one'].matchNode(headingOneNode)).toBe(true);
    expect(result.current['heading-one'].matchNode(headingSixNode)).toBe(false);
    expect(result.current['heading-one'].matchNode(linkNode)).toBe(false);
    expect(result.current['heading-one'].matchNode(codeNode)).toBe(false);
    expect(result.current['heading-one'].matchNode(quoteNode)).toBe(false);
    expect(result.current['heading-one'].matchNode(orderedListNode)).toBe(false);
    expect(result.current['heading-one'].matchNode(unorderedListNode)).toBe(false);
    expect(result.current['heading-one'].matchNode(listItemNode)).toBe(false);
    expect(result.current['heading-one'].matchNode(imageNode)).toBe(false);

    expect(result.current['heading-six'].matchNode(paragraphNode)).toBe(false);
    expect(result.current['heading-six'].matchNode(headingOneNode)).toBe(false);
    expect(result.current['heading-six'].matchNode(headingSixNode)).toBe(true);
    expect(result.current['heading-six'].matchNode(linkNode)).toBe(false);
    expect(result.current['heading-six'].matchNode(codeNode)).toBe(false);
    expect(result.current['heading-six'].matchNode(quoteNode)).toBe(false);
    expect(result.current['heading-six'].matchNode(orderedListNode)).toBe(false);
    expect(result.current['heading-six'].matchNode(unorderedListNode)).toBe(false);
    expect(result.current['heading-six'].matchNode(listItemNode)).toBe(false);
    expect(result.current['heading-six'].matchNode(imageNode)).toBe(false);

    expect(result.current.link.matchNode(paragraphNode)).toBe(false);
    expect(result.current.link.matchNode(headingOneNode)).toBe(false);
    expect(result.current.link.matchNode(headingSixNode)).toBe(false);
    expect(result.current.link.matchNode(linkNode)).toBe(true);
    expect(result.current.link.matchNode(codeNode)).toBe(false);
    expect(result.current.link.matchNode(quoteNode)).toBe(false);
    expect(result.current.link.matchNode(orderedListNode)).toBe(false);
    expect(result.current.link.matchNode(unorderedListNode)).toBe(false);
    expect(result.current.link.matchNode(listItemNode)).toBe(false);
    expect(result.current.link.matchNode(imageNode)).toBe(false);

    expect(result.current.code.matchNode(paragraphNode)).toBe(false);
    expect(result.current.code.matchNode(headingOneNode)).toBe(false);
    expect(result.current.code.matchNode(headingSixNode)).toBe(false);
    expect(result.current.code.matchNode(linkNode)).toBe(false);
    expect(result.current.code.matchNode(codeNode)).toBe(true);
    expect(result.current.code.matchNode(quoteNode)).toBe(false);
    expect(result.current.code.matchNode(orderedListNode)).toBe(false);
    expect(result.current.code.matchNode(unorderedListNode)).toBe(false);
    expect(result.current.code.matchNode(listItemNode)).toBe(false);
    expect(result.current.code.matchNode(imageNode)).toBe(false);

    expect(result.current.quote.matchNode(paragraphNode)).toBe(false);
    expect(result.current.quote.matchNode(headingOneNode)).toBe(false);
    expect(result.current.quote.matchNode(headingSixNode)).toBe(false);
    expect(result.current.quote.matchNode(linkNode)).toBe(false);
    expect(result.current.quote.matchNode(codeNode)).toBe(false);
    expect(result.current.quote.matchNode(quoteNode)).toBe(true);
    expect(result.current.quote.matchNode(orderedListNode)).toBe(false);
    expect(result.current.quote.matchNode(unorderedListNode)).toBe(false);
    expect(result.current.quote.matchNode(listItemNode)).toBe(false);
    expect(result.current.quote.matchNode(imageNode)).toBe(false);

    expect(result.current['list-ordered'].matchNode(paragraphNode)).toBe(false);
    expect(result.current['list-ordered'].matchNode(headingOneNode)).toBe(false);
    expect(result.current['list-ordered'].matchNode(headingSixNode)).toBe(false);
    expect(result.current['list-ordered'].matchNode(linkNode)).toBe(false);
    expect(result.current['list-ordered'].matchNode(codeNode)).toBe(false);
    expect(result.current['list-ordered'].matchNode(quoteNode)).toBe(false);
    expect(result.current['list-ordered'].matchNode(orderedListNode)).toBe(true);
    expect(result.current['list-ordered'].matchNode(unorderedListNode)).toBe(false);
    expect(result.current['list-ordered'].matchNode(listItemNode)).toBe(false);
    expect(result.current['list-ordered'].matchNode(imageNode)).toBe(false);

    expect(result.current['list-unordered'].matchNode(paragraphNode)).toBe(false);
    expect(result.current['list-unordered'].matchNode(headingOneNode)).toBe(false);
    expect(result.current['list-unordered'].matchNode(headingSixNode)).toBe(false);
    expect(result.current['list-unordered'].matchNode(linkNode)).toBe(false);
    expect(result.current['list-unordered'].matchNode(codeNode)).toBe(false);
    expect(result.current['list-unordered'].matchNode(quoteNode)).toBe(false);
    expect(result.current['list-unordered'].matchNode(orderedListNode)).toBe(false);
    expect(result.current['list-unordered'].matchNode(unorderedListNode)).toBe(true);
    expect(result.current['list-unordered'].matchNode(listItemNode)).toBe(false);
    expect(result.current['list-unordered'].matchNode(imageNode)).toBe(false);

    expect(result.current['list-item'].matchNode(paragraphNode)).toBe(false);
    expect(result.current['list-item'].matchNode(headingOneNode)).toBe(false);
    expect(result.current['list-item'].matchNode(headingSixNode)).toBe(false);
    expect(result.current['list-item'].matchNode(linkNode)).toBe(false);
    expect(result.current['list-item'].matchNode(codeNode)).toBe(false);
    expect(result.current['list-item'].matchNode(quoteNode)).toBe(false);
    expect(result.current['list-item'].matchNode(orderedListNode)).toBe(false);
    expect(result.current['list-item'].matchNode(unorderedListNode)).toBe(false);
    expect(result.current['list-item'].matchNode(listItemNode)).toBe(true);
    expect(result.current['list-item'].matchNode(imageNode)).toBe(false);

    expect(result.current.image.matchNode(paragraphNode)).toBe(false);
    expect(result.current.image.matchNode(headingOneNode)).toBe(false);
    expect(result.current.image.matchNode(headingSixNode)).toBe(false);
    expect(result.current.image.matchNode(linkNode)).toBe(false);
    expect(result.current.image.matchNode(codeNode)).toBe(false);
    expect(result.current.image.matchNode(quoteNode)).toBe(false);
    expect(result.current.image.matchNode(orderedListNode)).toBe(false);
    expect(result.current.image.matchNode(unorderedListNode)).toBe(false);
    expect(result.current.image.matchNode(listItemNode)).toBe(false);
    expect(result.current.image.matchNode(imageNode)).toBe(true);
  });

  it('renders a paragraph block properly', () => {
    const { result } = renderHook(useBlocksStore, { wrapper: Wrapper });

    render(result.current.paragraph.renderElement({ children: 'Some text' }), { wrapper: Wrapper });
    const paragraph = screen.getByText('Some text');
    expect(paragraph).toBeInTheDocument();
  });

  it('renders a heading block properly', () => {
    const { result } = renderHook(useBlocksStore, { wrapper: Wrapper });

    render(
      result.current['heading-two'].renderElement({
        children: 'Some heading',
        element: { level: 2 },
        attributes: {},
      }),
      {
        wrapper: Wrapper,
      }
    );
    const heading = screen.getByRole('heading', { level: 2, name: 'Some heading' });
    expect(heading).toBeInTheDocument();
  });

  it('renders a link block properly', () => {
    const { result } = renderHook(useBlocksStore, { wrapper: Wrapper });

    act(() => {
      baseEditor.children = [
        {
          type: 'paragraph',
          children: [
            {
              type: 'link',
              url: 'https://example.com',
              children: [{ text: 'Some link' }],
            },
          ],
        },
      ];
    });

    act(() => {
      render(
        result.current.link.renderElement({
          children: 'Some link',
          element: { type: 'link', url: 'https://example.com', children: [{ text: 'Some link' }] },
          attributes: {},
        }),
        {
          wrapper: Wrapper,
        }
      );
    });
    const link = screen.getByRole('link', 'Some link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  it('renders a popover for each link and its opened when users click the link', async () => {
    const { result } = renderHook(useBlocksStore, { wrapper: Wrapper });

    render(
      result.current.link.renderElement({
        children: 'Some link',
        element: { url: 'https://example.com', children: [{ text: 'Some' }, { text: ' link' }] },
        attributes: {},
      }),
      {
        wrapper: Wrapper,
      }
    );
    const link = screen.getByRole('link', 'Some link');

    expect(screen.queryByRole('button', { name: /Delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit/i })).not.toBeInTheDocument();

    await user.click(link);

    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit/i })).toBeInTheDocument();
  });

  it('renders link fields to edit when user clicks the edit option and check save button disabled state', async () => {
    const { result } = renderHook(useBlocksStore, { wrapper: Wrapper });

    render(
      result.current.link.renderElement({
        children: 'Some link',
        element: { url: 'https://example.com', children: [{ text: 'Some' }, { text: ' link' }] },
        attributes: {},
      }),
      {
        wrapper: Wrapper,
      }
    );
    const link = screen.getByRole('link', 'Some link');
    await user.click(link);
    const editButton = screen.queryByLabelText(/Edit/i, { selector: 'button' });
    await user.click(editButton);

    const linkTextInput = screen.getByPlaceholderText('Enter link text');
    const SaveButton = screen.getAllByRole('button', { type: 'submit' });
    expect(SaveButton[1]).not.toBeDisabled(); // SaveButton[1] is a popover save button

    // Remove link text and check if save button is disabled
    userEvent.clear(linkTextInput);
    expect(SaveButton[1]).toBeDisabled();
  });

  it('renders a code block properly', () => {
    const { result } = renderHook(useBlocksStore, { wrapper: Wrapper });

    render(
      result.current.code.renderElement({
        children: 'Some code',
        attributes: {},
      }),
      {
        wrapper: Wrapper,
      }
    );
    const code = screen.getByRole('code', 'Some code');
    expect(code).toBeInTheDocument();
  });

  it('renders a quote block properly', () => {
    const { result } = renderHook(useBlocksStore, { wrapper: Wrapper });

    render(
      result.current.quote.renderElement({
        children: 'Some quote',
        attributes: {},
      }),
      {
        wrapper: Wrapper,
      }
    );
    const quote = screen.getByRole('blockquote', 'Some quote');
    expect(quote).toBeInTheDocument();
  });

  it('renders an unordered list block properly', () => {
    const { result } = renderHook(useBlocksStore, { wrapper: Wrapper });

    render(
      result.current['list-unordered'].renderElement({
        children: 'list unordered',
        element: {
          format: 'unordered',
        },
        attributes: {},
      }),
      {
        wrapper: Wrapper,
      }
    );

    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();
  });

  it('renders a list item block properly', () => {
    const { result } = renderHook(useBlocksStore, { wrapper: Wrapper });

    render(
      result.current['list-item'].renderElement({
        children: 'list item',
        attributes: {},
      }),
      {
        wrapper: Wrapper,
      }
    );
    const listItem = screen.getByRole('listitem', 'list item');
    expect(listItem).toBeInTheDocument();
  });

  it('renders an image block properly', () => {
    const { result } = renderHook(useBlocksStore, { wrapper: Wrapper });

    render(
      result.current.image.renderElement({
        children: '',
        element: {
          image: { url: 'https://example.com/image.png', alternativeText: 'Some image' },
        },
        attributes: {},
      }),
      {
        wrapper: Wrapper,
      }
    );
    const image = screen.getByRole('img', { name: 'Some image' });
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image.png');
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
    result.current.paragraph.handleEnterKey(baseEditor);

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
    result.current.code.handleEnterKey(baseEditor);

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
    result.current['list-unordered'].handleEnterKey(baseEditor);

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
    result.current['list-unordered'].handleEnterKey(baseEditor);

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
    result.current['list-ordered'].handleEnterKey(baseEditor);

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
    result.current['list-unordered'].handleBackspaceKey(baseEditor, mockEvent);

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
    result.current['list-ordered'].handleBackspaceKey(baseEditor, mockEvent);

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
    result.current['list-ordered'].handleBackspaceKey(baseEditor, mockEvent);

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
    result.current['list-ordered'].handleBackspaceKey(baseEditor, mockEvent);

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
    result.current['list-unordered'].handleBackspaceKey(baseEditor, mockEvent);

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
    result.current['list-unordered'].handleBackspaceKey(baseEditor, mockEvent);

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
    result.current.quote.handleEnterKey(baseEditor);

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
    result.current.quote.handleEnterKey(baseEditor);

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

    const cursorInitialPosition = baseEditor.selection.anchor.path;

    // Simulate the enter key
    result.current.paragraph.handleEnterKey(baseEditor);

    const cursorPositionAfterFirstEnter = baseEditor.selection.anchor.path;

    // Check if the cursor is positioned in the new line
    expect(cursorPositionAfterFirstEnter[0]).toEqual(cursorInitialPosition[0] + 1);

    // Set the cursor after "Line of"
    Transforms.select(baseEditor, {
      anchor: { path: [0, 0], offset: 7 },
      focus: { path: [0, 0], offset: 7 },
    });

    // Simulate another the enter key
    result.current.paragraph.handleEnterKey(baseEditor);

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
    result.current.paragraph.handleEnterKey(baseEditor);

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
    result.current['list-unordered'].handleEnterKey(baseEditor);

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

  it('keeps modifiers when creating a new line in the middle of a block with modifiers', () => {
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
    result.current.paragraph.handleEnterKey(baseEditor);

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
    result.current.quote.handleEnterKey(baseEditor);

    // Once on the new line, bold and italic should be disabled
    expect(Editor.marks(baseEditor)).toEqual({ type: 'text' });
  });
});
