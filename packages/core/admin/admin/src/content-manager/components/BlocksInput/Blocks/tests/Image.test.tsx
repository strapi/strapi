/* eslint-disable testing-library/no-node-access */
import { render, screen } from '@testing-library/react';
import { Transforms, createEditor } from 'slate';

import { mockImage } from '../../tests/mock-schema';
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

  it('handles enter key on an image', () => {
    const baseEditor = createEditor();
    baseEditor.children = [
      {
        type: 'image',
        image: mockImage,
        children: [{ type: 'text', text: '' }],
      },
    ];

    Transforms.select(baseEditor, {
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 0 },
    });

    imageBlocks.image.handleEnterKey!(baseEditor);

    // Should insert a paragraph after the image
    expect(baseEditor.children).toEqual([
      {
        type: 'image',
        image: mockImage,
        children: [{ type: 'text', text: '' }],
      },
      {
        type: 'paragraph',
        children: [{ type: 'text', text: '' }],
      },
    ]);
  });
});
