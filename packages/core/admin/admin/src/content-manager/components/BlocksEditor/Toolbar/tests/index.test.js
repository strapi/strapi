import * as React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PropTypes from 'prop-types';
import { IntlProvider } from 'react-intl';
import { createEditor, Transforms, Editor } from 'slate';
import { Slate, withReact } from 'slate-react';

import { BlocksToolbar, BlocksDropdown } from '..';

const title = 'dialog component';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useLibrary: jest.fn().mockImplementation(() => ({
    components: {
      'media-library': () => <div>{title}</div>,
    },
  })),
}));

const initialValue = [
  {
    type: 'paragraph',
    children: [{ type: 'text', text: 'A line of text in a paragraph.' }],
  },
];

const mixedInitialValue = [
  {
    type: 'heading',
    level: 1,
    children: [{ type: 'text', text: 'A heading one' }],
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

const user = userEvent.setup();

const baseEditor = createEditor();

const Wrapper = ({ children, initialData }) => {
  const [editor] = React.useState(() => withReact(baseEditor));

  return (
    <ThemeProvider theme={lightTheme}>
      <IntlProvider messages={{}} locale="en">
        <Slate initialValue={initialData} editor={editor}>
          {children}
        </Slate>
      </IntlProvider>
    </ThemeProvider>
  );
};

Wrapper.propTypes = {
  children: PropTypes.node.isRequired,
  initialData: PropTypes.array,
};

Wrapper.defaultProps = {
  initialData: initialValue,
};

const setup = (data) => {
  render(<BlocksToolbar />, {
    wrapper: ({ children }) => <Wrapper initialData={data}>{children}</Wrapper>,
  });
};

describe('BlocksEditor toolbar', () => {
  it('should render the toolbar', () => {
    setup(initialValue);

    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });

  it('toggles the modifier on a selection', async () => {
    setup();

    const boldButton = screen.getByLabelText(/bold/i);
    const italicButton = screen.getByLabelText(/italic/i);

    // Simulate a selection of part of the editor
    Transforms.select(baseEditor, {
      anchor: { path: [0, 0], offset: 2 },
      focus: { path: [0, 0], offset: 14 },
    });

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
    expect(baseEditor.children).toEqual(initialValue);

    // The bold and italic buttons should have the inactive state
    expect(boldButton).toHaveAttribute('data-state', 'off');
    expect(italicButton).toHaveAttribute('data-state', 'off');
  });

  it('transforms the selection to a list and toggles the format', async () => {
    setup();

    const unorderedListButton = screen.getByLabelText(/unordered list/i);
    const orderedListButton = screen.getByLabelText(/^ordered list/i);

    Transforms.setSelection(baseEditor, {
      anchor: { path: [0, 0], offset: 2 },
    });

    await user.click(unorderedListButton);
    expect(unorderedListButton).toHaveAttribute('data-state', 'on');
    expect(orderedListButton).toHaveAttribute('data-state', 'off');

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
  });
  it('transforms the selection to a heading when selected and trasforms it back to text when selected again', async () => {
    setup();

    const headingsDropdown = screen.getByRole('combobox', { name: /Select a block/i });

    Transforms.setSelection(baseEditor, {
      anchor: { path: [0, 0], offset: 2 },
    });

    await user.click(headingsDropdown);

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

    await user.click(headingsDropdown);

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
  });

  it('transforms the selection to a quote when selected and trasforms it back to text when selected again', async () => {
    setup();

    const headingsDropdown = screen.getByRole('combobox', { name: /Select a block/i });

    Transforms.setSelection(baseEditor, {
      anchor: { path: [0, 0], offset: 0 },
    });

    await user.click(headingsDropdown);

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

    await user.click(headingsDropdown);

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
  });

  it('when image is selected, it will set modal dialog open to select the images', async () => {
    render(<BlocksDropdown />, {
      wrapper: Wrapper,
    });

    Transforms.setSelection(baseEditor, {
      anchor: { path: [0, 0], offset: 0 },
    });

    const headingsDropdown = screen.getByRole('combobox', { name: /Select a block/i });

    await user.click(headingsDropdown);

    await user.click(screen.getByRole('option', { name: 'Image' }));

    expect(screen.getByText(title)).toBeInTheDocument();
  });

  it('check if a mixed selected content show only one option selected in the dropdown', async () => {
    setup(mixedInitialValue);

    const headingsDropdown = screen.getByRole('combobox', { name: /Select a block/i });

    // Set the selection to cover the entire content
    waitFor(() => {
      Transforms.setSelection(baseEditor, {
        anchor: Editor.start(baseEditor, []),
        focus: Editor.end(baseEditor, []),
      });
    });

    // the dropdown should show only one option selected which is the block content in the first row
    expect(within(headingsDropdown).getByText(/heading 1/i)).toBeInTheDocument();
  });

  it('check if a mixed selected content show only one option selected in the dropdown when you select only part of the content', async () => {
    setup(mixedInitialValue);

    const headingsDropdown = screen.getByRole('combobox', { name: /Select a block/i });

    // Set the selection to cover the second and third row
    waitFor(() => {
      Transforms.setSelection(baseEditor, {
        anchor: { path: [1, 0], offset: 0 },
      });
    });

    // the dropdown should show only one option selected which is the block content in the second row
    expect(within(headingsDropdown).getByText(/text/i)).toBeInTheDocument();
  });
});
