import { render, screen, within } from '@testing-library/react';

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
});
