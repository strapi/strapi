/* eslint-disable testing-library/no-node-access */
/* eslint-disable check-file/filename-naming-convention */

import * as React from 'react';

import { within } from '@testing-library/react';
import { act, render, screen } from '@tests/utils';
import { type Descendant, type Editor, type Location, createEditor, Transforms } from 'slate';
import { Slate, withReact, ReactEditor } from 'slate-react';

import { codeBlocks } from '../Blocks/Code';
import { headingBlocks } from '../Blocks/Heading';
import { imageBlocks } from '../Blocks/Image';
import { linkBlocks } from '../Blocks/Link';
import { listBlocks } from '../Blocks/List';
import { paragraphBlocks } from '../Blocks/Paragraph';
import { quoteBlocks } from '../Blocks/Quote';
import { type BlocksStore, BlocksEditorProvider } from '../BlocksEditor';
import { BlocksToolbar } from '../BlocksToolbar';
import { modifiers } from '../Modifiers';

const defaultInitialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ type: 'text', text: 'A line of text in a paragraph.' }],
  },
];

const mixedInitialValue: Descendant[] = [
  {
    type: 'heading',
    level: 1,
    children: [
      { type: 'text', text: 'A heading one' },
      { type: 'text', text: ' with modifiers', bold: true },
    ],
  },
  {
    type: 'paragraph',
    children: [{ type: 'text', text: 'A line of text in a paragraph.' }],
  },
  {
    type: 'heading',
    level: 2,
    children: [{ type: 'text', text: 'A heading two' }],
  },
];

const imageInitialValue: Descendant[] = [
  {
    type: 'image',
    children: [{ text: '', type: 'text' }],
    image: {
      name: 'test.jpg',
      alternativeText: 'test',
      caption: null,
      createdAt: '2021-08-31T14:00:00.000Z',
      ext: '.jpg',
      formats: {},
      hash: 'test',
      height: 300,
      mime: 'image/jpeg',
      previewUrl: null,
      provider: 'local',
      size: 100,
      updatedAt: '2021-08-31T14:00:00.000Z',
      url: '/uploads/test.jpg',
      width: 200,
    },
  },
];

const blocks: BlocksStore = {
  ...paragraphBlocks,
  ...headingBlocks,
  ...listBlocks,
  ...linkBlocks,
  ...imageBlocks,
  ...quoteBlocks,
  ...codeBlocks,
};

// Create editor outside of the component to have direct access to it from the tests
let baseEditor: Editor;

const Wrapper = ({
  children,
  initialValue,
}: {
  children: React.ReactNode;
  initialValue: Descendant[];
}) => {
  const [editor] = React.useState(() => withReact(baseEditor));

  return (
    <Slate initialValue={initialValue} editor={editor}>
      <BlocksEditorProvider
        blocks={blocks}
        modifiers={modifiers}
        disabled={false}
        name="blocks"
        setLiveText={jest.fn()}
        isExpandedMode={false}
      >
        {children}
      </BlocksEditorProvider>
    </Slate>
  );
};

/**
 * Selects the given location without triggering warnings
 * act is required because we're making an update outside of React that React needs to sync with
 * And it only works if act is awaited
 */
const select = async (location: Location) => {
  await act(async () => Transforms.select(baseEditor, location));
};

/**
 * Render the toolbar inside the required context providers
 */
const setup = (data: Descendant[] = defaultInitialValue) => {
  // Create a fresh instance of a Slate editor
  // so that we have no side effects due to the previous selection or children
  baseEditor = createEditor();

  return render(<BlocksToolbar />, {
    renderOptions: { wrapper: ({ children }) => <Wrapper initialValue={data}>{children}</Wrapper> },
  });
};

describe('BlocksToolbar', () => {
  beforeEach(() => {
    /**
     * TODO: Find a way to use the actual implementation
     * Currently the editor throws an error as if the editor argument is missing:
     * Cannot resolve a DOM node from Slate node:
     */
    ReactEditor.focus = jest.fn();
  });

  it('should render the toolbar', () => {
    setup();

    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });

  it('checks if a mixed selected content shows only one option selected in the dropdown when you select only part of the content', async () => {
    setup(mixedInitialValue);

    // Set the selection to cover the second and third row
    await select({
      anchor: { path: [1, 0], offset: 0 },
      focus: { path: [2, 0], offset: 0 },
    });

    // The dropdown should show only one option selected which is the block content in the second row
    const blocksDropdown = screen.getByRole('combobox', { name: /Select a block/i });
    expect(within(blocksDropdown).getByText(/text/i)).toBeInTheDocument();
    expect(within(blocksDropdown).queryByText(/heading/i)).not.toBeInTheDocument();
  });

  it('toggles the modifiers on a selection', async () => {
    const { user } = setup();

    // Simulate a selection of part of the editor
    await select({
      anchor: { path: [0, 0], offset: 2 },
      focus: { path: [0, 0], offset: 14 },
    });

    // Get modifier buttons
    const boldButton = screen.getByLabelText(/bold/i);
    const italicButton = screen.getByLabelText(/italic/i);

    // We make that selection bold and italic
    await user.click(boldButton);
    await user.click(italicButton);

    // The selection must have been isolated in its own child node
    expect(baseEditor.children).toEqual([
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'A ',
          },
          {
            type: 'text',
            text: 'line of text',
            bold: true,
            italic: true,
          },
          {
            type: 'text',
            text: ' in a paragraph.',
          },
        ],
      },
    ]);

    // The bold and italic buttons should have the active state
    expect(boldButton).toHaveAttribute('data-state', 'on');
    expect(italicButton).toHaveAttribute('data-state', 'on');

    // We remove the bold and italic modifiers
    await user.click(boldButton);
    await user.click(italicButton);

    // The selection should be back a single node
    expect(baseEditor.children).toEqual(defaultInitialValue);

    // The bold and italic buttons should have the inactive state
    expect(boldButton).toHaveAttribute('data-state', 'off');
    expect(italicButton).toHaveAttribute('data-state', 'off');
    expect(ReactEditor.focus).toHaveBeenCalledTimes(4);
  });

  it('transforms the selection to a list and toggles the format', async () => {
    const { user } = setup();

    await select({
      anchor: { path: [0, 0], offset: 2 },
      focus: { path: [0, 0], offset: 2 },
    });

    // Get modifier buttons
    const unorderedListButton = screen.getByLabelText(/bulleted list/i);
    const orderedListButton = screen.getByLabelText(/^numbered list/i);

    // Convert the selection to an unordered list
    await user.click(unorderedListButton);
    expect(unorderedListButton).toHaveAttribute('data-state', 'on');
    expect(orderedListButton).toHaveAttribute('data-state', 'off');

    // Convert the selection to an ordered list
    await user.click(orderedListButton);
    expect(unorderedListButton).toHaveAttribute('data-state', 'off');
    expect(orderedListButton).toHaveAttribute('data-state', 'on');

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
                text: 'A line of text in a paragraph.',
              },
            ],
          },
        ],
      },
    ]);

    expect(ReactEditor.focus).toHaveBeenCalledTimes(2);
  });

  it('toggles the nested list format', async () => {
    const { user } = setup([
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
                text: 'list item 2',
              },
            ],
          },
        ],
      },
    ]);

    // Select first sub item and toggle it
    await select({
      anchor: { path: [0, 1, 0, 0], offset: 0 },
      focus: { path: [0, 1, 0, 0], offset: 0 },
    });

    // Get modifier buttons
    const unorderedListButton = screen.getByLabelText(/bulleted list/i);
    const orderedListButton = screen.getByLabelText(/^numbered list/i);

    // Convert the selection to an unordered list
    await user.click(unorderedListButton);
    expect(unorderedListButton).toHaveAttribute('data-state', 'on');
    expect(orderedListButton).toHaveAttribute('data-state', 'off');

    // Selected sub list format should toggle to "unordered"
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
            format: 'unordered',
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
                text: 'list item 2',
              },
            ],
          },
        ],
      },
    ]);
  });

  it('transforms the selection to a heading and transforms it back to text when selected again', async () => {
    const { user } = setup();

    await select({
      anchor: { path: [0, 0], offset: 2 },
      focus: { path: [0, 0], offset: 2 },
    });

    // Convert selection to a heading
    const blocksDropdown = screen.getByRole('combobox', { name: /Select a block/i });
    await user.click(blocksDropdown);
    await user.click(screen.getByRole('option', { name: 'Heading 1' }));

    expect(baseEditor.children).toEqual([
      {
        type: 'heading',
        level: 1,
        children: [
          {
            type: 'text',
            text: 'A line of text in a paragraph.',
          },
        ],
      },
    ]);

    // Convert selection to a paragraph
    await user.click(blocksDropdown);
    await user.click(screen.getByRole('option', { name: 'Text' }));

    expect(baseEditor.children).toEqual([
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'A line of text in a paragraph.',
          },
        ],
      },
    ]);

    expect(ReactEditor.focus).toHaveBeenCalledTimes(2);
  });

  it('transforms the selection to an ordered list and to an unordered list', async () => {
    const { user } = setup();

    await select({
      anchor: { path: [0, 0], offset: 2 },
      focus: { path: [0, 0], offset: 2 },
    });

    // Convert selection to an ordered list
    const blocksDropdown = screen.getByRole('combobox', { name: /Select a block/i });
    await user.click(blocksDropdown);
    await user.click(screen.getByRole('option', { name: 'Numbered list' }));

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
                text: 'A line of text in a paragraph.',
              },
            ],
          },
        ],
      },
    ]);

    // Convert selection to an unordered list
    await user.click(blocksDropdown);
    await user.click(screen.getByRole('option', { name: 'Bulleted list' }));

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
                text: 'A line of text in a paragraph.',
              },
            ],
          },
        ],
      },
    ]);
  });

  it('transforms the selection to a quote when selected and transforms it back to text', async () => {
    const { user } = setup();

    await select({
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 0 },
    });

    // Convert selection to a quote
    const blocksDropdown = screen.getByRole('combobox', { name: /Select a block/i });
    await user.click(blocksDropdown);
    await user.click(screen.getByRole('option', { name: 'Quote' }));

    expect(baseEditor.children).toEqual([
      {
        type: 'quote',
        children: [
          {
            type: 'text',
            text: 'A line of text in a paragraph.',
          },
        ],
      },
    ]);

    // Convert selection to a paragraph
    await user.click(blocksDropdown);
    await user.click(screen.getByRole('option', { name: 'Text' }));

    expect(baseEditor.children).toEqual([
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'A line of text in a paragraph.',
          },
        ],
      },
    ]);

    expect(ReactEditor.focus).toHaveBeenCalledTimes(2);
  });

  it('only shows one option selected in the dropdown when mixed content is selected', async () => {
    setup(mixedInitialValue);

    // Set the selection to cover the first and second
    await select({
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [1, 0], offset: 0 },
    });

    // The dropdown should show only one option selected which is the block content in the first row
    const blocksDropdown = screen.getByRole('combobox', { name: /Select a block/i });
    expect(within(blocksDropdown).getByText(/heading 1/i)).toBeInTheDocument();
  });

  it('splits the parent list when converting a list item to another type', async () => {
    const { user } = setup([
      {
        type: 'list',
        format: 'ordered',
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
          {
            type: 'list-item',
            children: [
              {
                type: 'text',
                text: 'Third list item',
              },
            ],
          },
        ],
      },
    ]);

    // Select the item in the middle of the list
    await select({
      anchor: { path: [0, 1, 0], offset: 0 },
      focus: { path: [0, 1, 0], offset: 0 },
    });

    // Convert it to a code block
    const selectDropdown = screen.getByRole('combobox', { name: /Select a block/i });
    await user.click(selectDropdown);
    await user.click(screen.getByRole('option', { name: 'Code block' }));

    // The list should have been split in two
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
                text: 'First list item',
              },
            ],
          },
        ],
      },
      {
        type: 'code',
        language: 'plaintext',
        children: [
          {
            type: 'text',
            text: 'Second list item',
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
                text: 'Third list item',
              },
            ],
          },
        ],
      },
    ]);
  });

  it('creates a new node when selecting a block if there is no selection', async () => {
    const { user } = setup([
      {
        type: 'paragraph',
        children: [{ type: 'text', text: 'Some paragraph' }],
      },
    ]);

    // Convert selection to a code block
    const blocksDropdown = screen.getByRole('combobox', { name: /Select a block/i });
    await user.click(blocksDropdown);
    await user.click(screen.getByRole('option', { name: 'Quote' }));

    expect(baseEditor.children).toEqual([
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'Some paragraph',
          },
        ],
      },
      {
        type: 'quote',
        children: [
          {
            type: 'text',
            text: '',
          },
        ],
      },
    ]);

    expect(ReactEditor.focus).toHaveBeenCalledTimes(1);
  });

  it('should disable the link button when multiple blocks are selected', async () => {
    setup(mixedInitialValue);

    // Set the selection to cover the first and second
    await select({
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [1, 0], offset: 0 },
    });

    const linkButton = screen.getByLabelText(/link/i);
    expect(linkButton).toBeDisabled();

    // Set the selection to a range inside the same block node
    await select({
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 1], offset: 2 },
    });

    expect(linkButton).toBeEnabled();
  });

  it('creates a new list with empty content when you click on the button with an empty editor', async () => {
    const { user } = setup([
      {
        type: 'paragraph',
        children: [{ type: 'text', text: '' }],
      },
    ]);

    // Get the unordered list button
    const unorderedListButton = screen.getByLabelText(/bulleted list/i);

    // Convert selection to a unordered list
    await user.click(unorderedListButton);
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
                text: '',
              },
            ],
          },
        ],
      },
    ]);

    expect(ReactEditor.focus).toHaveBeenCalledTimes(1);
  });

  it('creates a new list with mixed content when you click on the button and editor contains mixed content paragraph', async () => {
    const { user } = setup([
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: 'A ',
          },
          {
            type: 'text',
            text: 'line of text',
            bold: true,
            italic: true,
          },
          {
            type: 'text',
            text: ' in a paragraph.',
          },
        ],
      },
    ]);

    // Get the unordered list button
    const unorderedListButton = screen.getByLabelText(/bulleted list/i);

    // Convert selection to a unordered list
    await user.click(unorderedListButton);

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
                text: 'A ',
              },
              {
                bold: true,
                italic: true,
                type: 'text',
                text: 'line of text',
              },
              {
                type: 'text',
                text: ' in a paragraph.',
              },
            ],
          },
        ],
      },
    ]);

    expect(ReactEditor.focus).toHaveBeenCalledTimes(1);
  });

  it('creates a new list with some content when you select the option in the dropdown and editor contains a heading on the last line', async () => {
    const { user } = setup(mixedInitialValue);

    const blocksDropdown = screen.getByRole('combobox', { name: /Select a block/i });

    // Convert selection to an ordered list
    await select({
      anchor: { path: [2, 0], offset: 0 },
      focus: { path: [2, 0], offset: 0 },
    });
    await user.click(blocksDropdown);
    await user.click(screen.getByRole('option', { name: 'Numbered list' }));

    expect(baseEditor.children).toEqual([
      {
        type: 'heading',
        level: 1,
        children: [
          { type: 'text', text: 'A heading one' },
          { type: 'text', text: ' with modifiers', bold: true },
        ],
      },
      {
        type: 'paragraph',
        children: [{ type: 'text', text: 'A line of text in a paragraph.' }],
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
                text: 'A heading two',
              },
            ],
          },
        ],
      },
    ]);
  });

  it('should disable the modifiers buttons when the selection is inside an image', async () => {
    setup(imageInitialValue);

    await select({
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 0 },
    });

    // The dropdown should show only one option selected which is the image
    const blocksDropdown = screen.getByRole('combobox', { name: /Select a block/i });
    expect(within(blocksDropdown).getByText(/image/i)).toBeInTheDocument();

    const linkButton = screen.getByLabelText(/link/i);
    expect(linkButton).toBeDisabled();
  });

  it('should disable the modifiers buttons and the link button when the selection is inside a code block', async () => {
    setup([
      {
        type: 'code',
        children: [
          {
            type: 'text',
            text: 'A line of code.',
          },
        ],
      },
    ]);

    await select({
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 0 },
    });

    const boldButton = screen.getByLabelText(/bold/i);
    const italicButton = screen.getByLabelText(/italic/i);
    expect(boldButton).toBeDisabled();
    expect(italicButton).toBeDisabled();

    const linkButton = screen.getByLabelText(/link/i);
    expect(linkButton).toBeDisabled();
  });
});
