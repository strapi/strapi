import { render, screen } from '@tests/utils';
import { createEditor } from 'slate';
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
          rel: 'noopener noreferrer',
          target: '_blank',
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
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders a link block without rel and target attributes', () => {
    render(
      linkBlocks.link.renderElement({
        children: 'Some link',
        element: {
          type: 'link',
          url: 'https://example.com',
          children: [{ type: 'text', text: 'Some link' }],
          rel: '',
          target: '',
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
    expect(link).toHaveAttribute('rel', '');
    expect(link).toHaveAttribute('target', '');
  });

  it('toggles the popover when clicking on a link', async () => {
    const { user } = render(
      linkBlocks.link.renderElement({
        children: 'Some link',
        element: {
          type: 'link',
          url: 'https://example.com',
          rel: 'noopener noreferrer',
          target: '_blank',
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

    expect(await screen.findByRole('button', { name: /Save/i })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  });

  it('only enables save button in popover when content has changed', async () => {
    const { user } = render(
      linkBlocks.link.renderElement({
        children: 'Some link',
        element: {
          type: 'link',
          url: 'https://example.com',
          rel: 'noopener noreferrer',
          target: '_blank',
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

    const linkTextInput = await screen.findByPlaceholderText('Enter link text');
    const saveButton = await screen.findByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();

    // change link text and check if save button is enabled
    await user.type(linkTextInput, 'new link');
    expect(saveButton).toBeEnabled();

    // Remove link text and check if save button is disabled
    await user.clear(linkTextInput);
    expect(saveButton).toBeDisabled();
  });

  it.each([
    'javascript:alert(1)',
    'VbScRiPt:msgbox(1)',
    'DATA:text/html,alert(1)',
    ' \tJaVaScRiPt:alert(1)',
    '%6aavascript:alert(1)',
  ])('does not allow saving an unsafe link URL: %s', async (url) => {
    const { user } = render(
      linkBlocks.link.renderElement({
        children: 'Some link',
        element: {
          type: 'link',
          url: 'https://example.com',
          rel: '',
          target: '',
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

    await user.click(screen.getByRole('link', { name: 'Some link' }));
    await user.clear(await screen.findByPlaceholderText('Paste link'));
    await user.type(screen.getByPlaceholderText('Paste link'), url);

    const saveButton = await screen.findByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();

    await user.type(screen.getByPlaceholderText('noopener, nofollow, noreferrer'), 'noopener');
    expect(saveButton).toBeDisabled();
  });

  it('does not allow a historical unsafe link to be saved after changing only its text', async () => {
    const { user } = render(
      linkBlocks.link.renderElement({
        children: 'Some link',
        element: {
          type: 'link',
          url: 'javascript:alert(1)',
          rel: '',
          target: '',
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

    await user.click(screen.getByText('Some link'));
    await user.type(await screen.findByPlaceholderText('Enter link text'), ' updated');

    expect(await screen.findByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('does not render a historical unsafe URL as a clickable link', async () => {
    const { user } = render(
      linkBlocks.link.renderElement({
        children: 'Some link',
        element: {
          type: 'link',
          url: 'javascript:alert(1)',
          rel: '',
          target: '',
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

    expect(screen.queryByRole('link', { name: 'Some link' })).not.toBeInTheDocument();
    await user.click(screen.getByText('Some link'));
    expect(await screen.findByPlaceholderText('Paste link')).toHaveValue('javascript:alert(1)');
  });

  it.each([
    'javascript:alert(1)',
    'VbScRiPt:msgbox(1)',
    'DATA:text/html,alert(1)',
    ' \tJaVaScRiPt:alert(1)',
    '%6aavascript:alert(1)',
    '/relative',
    '//example.com',
    '///example.com',
  ])('does not convert an unsafe pasted link URL: %s', (url) => {
    const editor = createEditor();
    const insertData = jest.fn();
    editor.insertData = insertData;
    const linkEditor = linkBlocks.link.plugin!(editor);

    linkEditor.insertData({ getData: () => url } as unknown as DataTransfer);

    expect(insertData).toHaveBeenCalled();
  });

  it('converts an allowed absolute pasted URL into a link', () => {
    const editor = createEditor();
    editor.children = [{ type: 'paragraph', children: [{ type: 'text', text: '' }] }];
    editor.selection = {
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 0 },
    };
    const insertData = jest.fn();
    editor.insertData = insertData;
    const linkEditor = linkBlocks.link.plugin!(editor);

    linkEditor.insertData({ getData: () => 'https://example.com' } as unknown as DataTransfer);

    expect(insertData).not.toHaveBeenCalled();
    expect(linkEditor.children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          children: expect.arrayContaining([
            expect.objectContaining({
              type: 'link',
              url: 'https://example.com',
            }),
          ]),
        }),
      ])
    );
  });
});
