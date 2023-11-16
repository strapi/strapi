import { render, screen } from '@testing-library/react';

import { imageBlocks } from '../Image';

import { Wrapper } from './Wrapper';

describe('Image', () => {
  it('renders an image block properly', () => {
    render(
      imageBlocks.image.renderElement({
        children: 'A line of text in a paragraph.',
        element: {
          type: 'image',
          image: { url: 'https://example.com/image.png', alternativeText: 'Some image' },
          children: [{ type: 'text', text: '' }],
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

    const image = screen.getByRole('img', { name: 'Some image' });
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image.png');
  });
});
