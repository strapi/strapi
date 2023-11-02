import * as React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PropTypes from 'prop-types';
import { IntlProvider } from 'react-intl';
import { createEditor, Transforms } from 'slate';
import { Slate, withReact, ReactEditor } from 'slate-react';

import { BlocksToolbar } from '..';

const mockMediaLibraryTitle = 'dialog component';
const mockMediaLibrarySubmitButton = 'upload images';
const mockMediaLibraryImage = {
  name: 'Screenshot 2023-10-18 at 15.03.11.png',
  alternativeText: 'Screenshot 2023-10-18 at 15.03.11.png',
  caption: null,
  width: 437,
  height: 420,
  formats: {
    thumbnail: {
      name: 'thumbnail_Screenshot 2023-10-18 at 15.03.11.png',
      hash: 'thumbnail_Screenshot_2023_10_18_at_15_03_11_c6d21f899b',
      ext: '.png',
      mime: 'image/png',
      path: null,
      width: 162,
      height: 156,
      size: 45.75,
      url: '/uploads/thumbnail_Screenshot_2023_10_18_at_15_03_11_c6d21f899b.png',
    },
  },
  hash: 'Screenshot_2023_10_18_at_15_03_11_c6d21f899b',
  ext: '.png',
  mime: 'image/png',
  size: 47.67,
  url: 'http://localhost:1337/uploads/Screenshot_2023_10_18_at_15_03_11_c6d21f899b.png',
  previewUrl: null,
  provider: 'local',
  provider_metadata: null,
  createdAt: '2023-10-18T15:54:33.504Z',
  updatedAt: '2023-10-18T15:54:33.504Z',
};

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useLibrary: jest.fn().mockImplementation(() => ({
    components: {
      'media-library': ({ onSelectAssets }) => (
        <div>
          <p>{mockMediaLibraryTitle}</p>
          <button type="button" onClick={() => onSelectAssets([mockMediaLibraryImage])}>
            {mockMediaLibrarySubmitButton}
          </button>
        </div>
      ),
    },
  })),
}));

const defaultInitialValue = [
  {
    type: 'paragraph',
    children: [{ type: 'text', text: 'A line of text in a paragraph.' }],
  },
];

const mixedInitialValue = [
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

const imageInitialValue = [
  {
    type: 'image',
    url: 'test.photos/200/300',
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

const user = userEvent.setup();

// Create editor outside of the component to have direct access to it from the tests
let baseEditor;

const Wrapper = ({ children, initialValue }) => {
  const [editor] = React.useState(() => withReact(baseEditor));

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
  initialValue: PropTypes.array.isRequired,
};

/**
 * Selects the given location without triggering warnings
 * act is required because we're making an update outside of React that React needs to sync with
 * And it only works if act is awaited
 * @param {import('slate').Location} selection
 */
const select = async (location) => {
  await act(async () => Transforms.select(baseEditor, location));
};

/**
 * Render the toolbar inside the required context providers
 * @param {import('slate').Descendant[]} data
 */
const setup = (data = defaultInitialValue) => {
  // Create a fresh instance of a Slate editor
  // so that we have no side effects due to the previous selection or children
  baseEditor = createEditor();

  render(<BlocksToolbar disabled={false} />, {
    wrapper: ({ children }) => <Wrapper initialValue={data}>{children}</Wrapper>,
  });
};

describe('BlocksEditor toolbar', () => {
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
    setup();

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
    setup();

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

  it('transforms the selection to a heading and transforms it back to text when selected again', async () => {
    setup();

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
    setup();

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
    setup();

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

  it('opens the media library when image is selected', async () => {
    setup();

    await select({
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 0 },
    });

    // Convert selection to an image
    const blocksDropdown = screen.getByRole('combobox', { name: /Select a block/i });
    await user.click(blocksDropdown);
    await user.click(screen.getByRole('option', { name: 'Image' }));

    expect(screen.getByText(mockMediaLibraryTitle)).toBeInTheDocument();
  });

  it('creates an empty paragraph below when a code block is created at the end of the editor', async () => {
    setup();

    await select({
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 0 },
    });

    // Convert selection to a code block
    const blocksDropdown = screen.getByRole('combobox', { name: /Select a block/i });
    await user.click(blocksDropdown);
    await user.click(screen.getByRole('option', { name: 'Code' }));

    expect(baseEditor.children).toEqual([
      {
        type: 'code',
        children: [
          {
            type: 'text',
            text: 'A line of text in a paragraph.',
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

    expect(ReactEditor.focus).toHaveBeenCalledTimes(1);
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
    setup([
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
    await user.click(screen.getByRole('option', { name: 'Code' }));

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

  it('creates a new code block without empty lines before it when you select the option in a empty editor', async () => {
    setup([
      {
        type: 'paragraph',
        children: [{ type: 'text', text: '' }],
      },
    ]);

    // Convert selection to a code block
    const blocksDropdown = screen.getByRole('combobox', { name: /Select a block/i });
    await user.click(blocksDropdown);
    await user.click(screen.getByRole('option', { name: 'Code' }));

    expect(baseEditor.children).toEqual([
      {
        type: 'code',
        format: null,
        level: null,
        children: [
          {
            type: 'text',
            text: '',
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

    expect(linkButton).not.toBeDisabled();
  });

  it('creates a new list with empty content when you click on the button with an empty editor', async () => {
    setup([
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
    setup([
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
    setup(mixedInitialValue);

    const blocksDropdown = screen.getByRole('combobox', { name: /Select a block/i });

    // Convert selection to an ordered list
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

  it('splits a list in two when converting a list item to an image', async () => {
    setup([
      {
        type: 'list',
        format: 'ordered',
        children: [
          { type: 'list-item', children: [{ type: 'text', text: 'First list item' }] },
          { type: 'list-item', children: [{ type: 'text', text: 'Second list item' }] },
          { type: 'list-item', children: [{ type: 'text', text: 'Third list item' }] },
        ],
      },
    ]);

    // Select the item in the middle of the list
    await select({
      anchor: { path: [0, 1, 0], offset: 0 },
      focus: { path: [0, 1, 0], offset: 0 },
    });

    // Convert it to an image
    const blocksDropdown = screen.getByRole('combobox', { name: /Select a block/i });
    await user.click(blocksDropdown);
    await user.click(screen.getByRole('option', { name: 'Image' }));
    await user.click(screen.getByText(mockMediaLibrarySubmitButton));

    // The list should have been split in two
    expect(baseEditor.children).toEqual([
      {
        type: 'list',
        format: 'ordered',
        children: [{ type: 'list-item', children: [{ type: 'text', text: 'First list item' }] }],
      },
      {
        type: 'image',
        image: mockMediaLibraryImage,
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
        children: [{ type: 'list-item', children: [{ type: 'text', text: 'Third list item' }] }],
      },
    ]);
  });
});
