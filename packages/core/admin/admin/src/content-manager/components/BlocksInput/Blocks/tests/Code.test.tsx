/* eslint-disable testing-library/no-node-access */
import { render, screen, within } from '@testing-library/react';
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
        wrapper: Wrapper,
      }
    );

    const pre = screen.getByRole('code');
    expect(pre).toBeInTheDocument();

    const code = within(pre).getByText('Some code');
    expect(code).toBeInTheDocument();
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
});
