import * as React from 'react';

import { render, screen } from '@testing-library/react';

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
        wrapper: ({ children }) => <Wrapper>{children}</Wrapper>,
      }
    );

    const heading = screen.getByRole('heading', { level: 2, name: 'Some heading' });
    expect(heading).toBeInTheDocument();
  });
});
