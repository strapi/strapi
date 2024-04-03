import { render, screen } from '@tests/utils';
import { ReactEditor } from 'slate-react';

import { linkBlocks } from '../Link';

import { Wrapper } from './Wrapper';

describe('Link', () => {
  beforeEach(() => {
    /**
     * @TODO: We need to find a way to use the actual implementation
     * This problem is also present at Toolbar tests
     */
    ReactEditor.findPath = jest.fn();
    ReactEditor.focus = jest.fn();
  });

  it('renders a link block properly', () => {
    render(
      linkBlocks.link.renderElement({
        children: 'Some link',
        element: {
          type: 'link',
          url: 'https://example.com',
          children: [{ type: 'text', text: 'Some link' }],
        },
        attributes: {
          'data-slate-node': 'element',
          ref: null,
        },
      }),
      {
        renderOptions: {
          wrapper: Wrapper,
        },
      }
    );

    const link = screen.getByRole('link', { name: 'Some link' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  it('toggles the popover when clicking on a link', async () => {
    const { user } = render(
      linkBlocks.link.renderElement({
        children: 'Some link',
        element: {
          type: 'link',
          url: 'https://example.com',
          children: [
            { type: 'text', text: 'Some' },
            { type: 'text', text: ' link' },
          ],
        },
        attributes: {
          'data-slate-node': 'element',
          ref: null,
        },
      }),
      {
        renderOptions: {
          wrapper: Wrapper,
        },
      }
    );

    const link = screen.getByRole('link', { name: 'Some link' });

    expect(screen.queryByRole('button', { name: /Save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancel/i })).not.toBeInTheDocument();

    await user.click(link);

    expect(screen.getByRole('button', { name: /Save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('only enables save button in popover when content has changed', async () => {
    const { user } = render(
      linkBlocks.link.renderElement({
        children: 'Some link',
        element: {
          type: 'link',
          url: 'https://example.com',
          children: [
            { type: 'text', text: 'Some' },
            { type: 'text', text: ' link' },
          ],
        },
        attributes: {
          'data-slate-node': 'element',
          ref: null,
        },
      }),
      {
        renderOptions: {
          wrapper: Wrapper,
        },
      }
    );

    const link = screen.getByRole('link', { name: 'Some link' });
    await user.click(link);

    const linkTextInput = screen.getByPlaceholderText('Enter link text');
    const saveButton = screen.queryByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();

    // change link text and check if save button is enabled
    await user.type(linkTextInput, 'new link');
    expect(saveButton).toBeEnabled();

    // Remove link text and check if save button is disabled
    await user.clear(linkTextInput);
    expect(saveButton).toBeDisabled();
  });
});
