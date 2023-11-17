/* eslint-disable testing-library/no-node-access */
import { render, screen } from '@testing-library/react';
import { Transforms, createEditor } from 'slate';

import { headingBlocks } from '../Heading';

import { Wrapper } from './Wrapper';

describe('Heading', () => {
  it('renders a heading block properly', () => {
    render(
      headingBlocks['heading-two'].renderElement({
        children: 'Some heading',
        element: { type: 'heading', level: 2, children: [{ type: 'text', text: 'Some heading' }] },
        attributes: {
          'data-slate-node': 'element',
          ref: null,
        },
      }),
      {
        wrapper: Wrapper,
      }
    );

    const heading = screen.getByRole('heading', { level: 2, name: 'Some heading' });
    expect(heading).toBeInTheDocument();
  });

  it('converts a code block to a heading', () => {
    const baseEditor = createEditor();
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

    Transforms.select(baseEditor, {
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 0 },
    });

    headingBlocks['heading-six'].handleConvert(baseEditor);
  });
});
