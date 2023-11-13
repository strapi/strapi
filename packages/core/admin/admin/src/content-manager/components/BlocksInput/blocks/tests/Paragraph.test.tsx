import { render, screen } from '@testing-library/react';

import { paragraphBlocks } from '../Paragraph';

import { Wrapper } from './Wrapper';

describe('Paragraph', () => {
  it('renders a heading block properly', () => {
    render(
      paragraphBlocks.paragraph.renderElement({
        children: 'A line of text in a paragraph.',
        element: {
          type: 'paragraph',
          children: [{ type: 'text', text: 'A line of text in a paragraph.' }],
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

    const paragraph = screen.getByText('A line of text in a paragraph.');
    expect(paragraph).toBeInTheDocument();
  });
});
