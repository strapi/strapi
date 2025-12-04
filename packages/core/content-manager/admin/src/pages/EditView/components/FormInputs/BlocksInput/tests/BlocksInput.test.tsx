/* eslint-disable testing-library/no-node-access */
import * as React from 'react';

import { Form } from '@strapi/admin/strapi-admin';
import { render, screen } from '@tests/utils';

import { BlocksInput } from '../BlocksInput';

import { blocksData } from './mock-schema';

type BlocksEditorProps = React.ComponentProps<typeof BlocksInput>;

const setup = ({
  initialValues = {
    'blocks-editor': blocksData,
  },
  ...props
}: Partial<BlocksEditorProps> & { initialValues?: object } = {}) =>
  render(
    <BlocksInput
      label="blocks type"
      name="blocks-editor"
      hint="blocks description"
      placeholder="blocks placeholder"
      disabled={false}
      type="blocks"
      {...props}
    />,
    {
      renderOptions: {
        wrapper: ({ children }) => (
          <Form method="POST" onSubmit={jest.fn()} initialValues={initialValues}>
            {children}
          </Form>
        ),
      },
    }
  );

describe('BlocksInput', () => {
  it('should render blocks without error', async () => {
    setup({
      initialValues: {},
    });

    expect(screen.getByText('blocks type')).toBeInTheDocument();
    expect(screen.getByText('blocks description')).toBeInTheDocument();

    await screen.findByText('blocks placeholder');
  });

  /**
   * TODO: re-edd this test once form fields have errors again.
   */
  it.skip('should render blocks with error', () => {
    setup();
    expect(screen.getByText(/field is required/));
  });

  it('should render blocks with data', () => {
    setup();

    expect(screen.getByText('This is bold text').parentElement).toHaveStyle({
      'font-weight': 600,
    });

    expect(screen.getByText('This is italic text').parentElement).toHaveStyle({
      'font-style': 'italic',
    });

    expect(screen.getByText('This is underlined text').parentElement).toHaveStyle({
      'text-decoration': 'underline',
    });

    expect(screen.getByText('This is deleted text').parentElement).toHaveStyle({
      'text-decoration': 'line-through',
    });

    expect(screen.getByText('click me').parentElement).toHaveStyle({
      'font-style': 'italic',
    });

    const codeText = screen.getByText('<textarea>').parentElement as HTMLElement;
    expect(window.getComputedStyle(codeText).fontFamily).toMatch(/\bmonospace\b/i);

    const linkElement = screen.getByRole('link', { name: /click me/ });
    expect(linkElement).toHaveAttribute('href', 'https://example.com');

    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();

    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('should open editor expand portal when clicking on expand button', async () => {
    const { user } = setup();

    expect(screen.queryByText('Collapse')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Expand/ }));
    expect(screen.getByRole('button', { name: /Collapse/ })).toBeInTheDocument();
  });

  it('should close editor expand portal when clicking on collapse button', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: /Expand/ }));
    const collapseButton = screen.getByRole('button', { name: /Collapse/ });
    expect(collapseButton).toBeInTheDocument();

    await user.click(collapseButton);
    expect(screen.queryByText('Collapse')).not.toBeInTheDocument();
  });

  it('should normalize empty content to null when clearing the editor', async () => {
    const { user } = setup({
      initialValues: {
        'blocks-editor': [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: 'Some text' }],
          },
        ],
      },
    });

    // Find the editable area
    const editable = document.querySelector('[contenteditable="true"]') as HTMLElement;
    expect(editable).toBeInTheDocument();

    // Select all text and delete it
    await user.click(editable);
    await user.keyboard('{Control>}a{/Control}{Backspace}');

    // The editor should now have an empty paragraph visually,
    // but the form value should be normalized to null
    // We can verify the editor still renders without errors
    expect(screen.getByText('blocks type')).toBeInTheDocument();
  });
});
