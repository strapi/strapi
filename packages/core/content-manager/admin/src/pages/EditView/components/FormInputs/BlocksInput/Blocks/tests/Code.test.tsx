/* eslint-disable testing-library/no-node-access */
import { act } from 'react';

import { render, screen } from '@tests/utils';
import { createEditor, Transforms, Editor } from 'slate';

import { codeBlocks } from '../Code';

import { Wrapper } from './Wrapper';

describe('Code', () => {
  it('renders a code block properly', () => {
    render(
      codeBlocks.code.renderElement({
        children: 'Some code',
        element: {
          type: 'code',
          children: [{ type: 'text', text: 'Some code' }],
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

    expect(screen.getByRole('code')).toBeInTheDocument();
    expect(screen.getByText('Some code')).toBeInTheDocument();
  });

  it('handles enter key on a code block', () => {
    const baseEditor = createEditor();

    baseEditor.children = [
      {
        type: 'code',
        children: [
          {
            type: 'text',
            text: 'Some code',
          },
        ],
      },
    ];

    // Simulate enter key press at the end of the code
    Transforms.select(baseEditor, {
      anchor: Editor.end(baseEditor, []),
      focus: Editor.end(baseEditor, []),
    });
    codeBlocks.code.handleEnterKey!(baseEditor);

    // Should enter a line break within the code
    expect(baseEditor.children).toEqual([
      {
        type: 'code',
        children: [
          {
            type: 'text',
            text: 'Some code\n',
          },
        ],
      },
    ]);

    // Simulate enter key press at the end of the code again
    Transforms.select(baseEditor, {
      anchor: Editor.end(baseEditor, []),
      focus: Editor.end(baseEditor, []),
    });
    codeBlocks.code.handleEnterKey!(baseEditor);

    // Should delete the line break and create a paragraph after the code
    expect(baseEditor.children).toEqual([
      {
        type: 'code',
        children: [
          {
            type: 'text',
            text: 'Some code',
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

  it('converts a quote block to a code block', () => {
    const baseEditor = createEditor();
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

    Transforms.select(baseEditor, {
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 0 },
    });

    codeBlocks.code.handleConvert!(baseEditor);

    expect(baseEditor.children).toEqual([
      {
        type: 'code',
        language: 'plaintext',
        children: [
          {
            type: 'text',
            text: 'Some quote',
          },
        ],
      },
    ]);
  });

  it.skip('changes the language of a code block', async () => {
    const baseEditor = createEditor();
    baseEditor.children = [
      {
        type: 'code',
        language: 'plaintext',
        children: [
          {
            type: 'text',
            text: `let leet = 'code'`,
          },
        ],
      },
    ];

    const { user } = render(
      codeBlocks.code.renderElement({
        children: `let leet = 'code'`,
        element: baseEditor.children[0],
        attributes: {
          'data-slate-node': 'element',
          ref: null,
        },
      }),
      {
        renderOptions: {
          wrapper: ({ children }) => <Wrapper baseEditor={baseEditor}>{children}</Wrapper>,
        },
      }
    );

    await act(async () => {
      Transforms.select(baseEditor, {
        anchor: { path: [0, 0], offset: 0 },
        focus: { path: [0, 0], offset: 0 },
      });
    });

    await user.click(screen.getByText('let leet'));

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
