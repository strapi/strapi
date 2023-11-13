import { render, screen } from '@testing-library/react';

import { quoteBlocks } from '../Quote';

import { Wrapper } from './Wrapper';

describe('Quote', () => {
  it('renders a quote block properly', () => {
    render(
      quoteBlocks.quote.renderElement({
        children: 'Some quote',
        element: {
          type: 'quote',
          children: [{ type: 'text', text: 'Some quote' }],
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

    const quote = screen.getByRole('blockquote');
    expect(quote).toBeInTheDocument();
    expect(quote).toHaveTextContent('Some quote');
  });
});
