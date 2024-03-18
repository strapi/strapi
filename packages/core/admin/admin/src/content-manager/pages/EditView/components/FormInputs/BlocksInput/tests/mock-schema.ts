/* eslint-disable check-file/filename-naming-convention */

import type { Schema } from '@strapi/types';

const mockImage = {
  url: 'https://via.placeholder.com/300/09f/fff.png',
  name: 'Screenshot 2023-08-22 at 10.33.50.png',
  alternativeText: 'My image alt text',
  caption: null,
  width: 300,
  height: 300,
  formats: {},
  hash: 'Screenshot_2023_08_22_at_10_33_50_ac7d5fd5b1',
  ext: '.png',
  mime: 'image/png',
  size: 17.95,
  previewUrl: null,
  provider: 'local',
  provider_metadata: null,
  createdAt: '2023-08-24T09:43:30.065Z',
  updatedAt: '2023-08-24T09:43:30.065Z',
};

const blocksData: Schema.Attribute.BlocksValue = [
  {
    type: 'paragraph',
    children: [
      { type: 'text', text: 'This is editable ' },
      { type: 'text', text: 'This is bold text', bold: true },
      { type: 'text', text: 'This is italic text', italic: true },
      { type: 'text', text: 'This is underlined text', underline: true },
      { type: 'text', text: 'This is deleted text', strikethrough: true },
      { type: 'text', text: '<textarea>\n', code: true },
      { type: 'text', text: 'It is me', italic: true },
      { type: 'text', text: 'Joe', underline: true, strikethrough: true },
      { type: 'text', text: 'Kai Doe', underline: true },
      {
        type: 'link',
        url: 'https://example.com',
        children: [{ type: 'text', text: 'click me', italic: true }],
      },
    ],
  },
  {
    type: 'code',
    children: [
      {
        type: 'text',
        text: '<SomeComponent />',
      },
    ],
  },
  // A paragraph with combined text modifiers
  {
    type: 'paragraph',
    children: [
      {
        type: 'text',
        text: 'This is a text with multiple tags',
        bold: true,
        italic: true,
        underline: true,
        strikethrough: true,
      },
      { type: 'text', text: 'This is code text', code: true },
    ],
  },
  // Links are inline nodes,
  // so if you want just a link node you need to put it inside a block node, like a paragraph
  {
    type: 'paragraph',
    children: [
      {
        type: 'link',
        url: 'https://strapi.io',
        children: [{ type: 'text', text: 'This paragraph is just a link' }],
      },
    ],
  },
  {
    type: 'quote',
    children: [
      {
        type: 'text',
        text: 'Some ancient wisdom',
      },
    ],
  },
  {
    type: 'heading',
    level: 1,
    children: [
      {
        type: 'text',
        text: 'heading 1',
      },
      {
        type: 'link',
        url: 'https://strapi.io',
        children: [
          {
            type: 'text',
            text: 'RFC',
          },
        ],
      },
    ],
  },
  {
    type: 'heading',
    level: 2,
    children: [
      {
        type: 'text',
        text: 'heading 2',
      },
    ],
  },
  {
    type: 'heading',
    level: 3,
    children: [
      {
        type: 'text',
        text: 'heading 3',
      },
    ],
  },
  {
    type: 'heading',
    level: 4,
    children: [
      {
        type: 'text',
        text: 'heading 4',
      },
    ],
  },
  {
    type: 'heading',
    level: 5,
    children: [
      {
        type: 'text',
        text: 'heading 5',
      },
    ],
  },
  {
    type: 'heading',
    level: 6,
    children: [
      {
        type: 'text',
        text: 'heading 6',
      },
    ],
  },
  {
    type: 'list',
    format: 'ordered',
    children: [
      {
        type: 'list-item',
        children: [
          {
            type: 'text',
            text: 'First item',
          },
        ],
      },
      {
        type: 'list-item',
        children: [
          {
            type: 'link',
            url: 'https://strapi.io',
            children: [
              {
                type: 'text',
                text: 'Second item',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    type: 'list',
    format: 'unordered',
    children: [
      {
        type: 'list-item',
        children: [
          {
            type: 'text',
            text: 'First item',
          },
        ],
      },
      {
        type: 'list-item',
        children: [
          {
            type: 'text',
            text: 'Second item',
          },
        ],
      },
    ],
  },
  {
    type: 'image',
    children: [{ type: 'text', text: '' }], // for void elements this needs to be defined
    image: mockImage,
  },
];

export { blocksData, mockImage };
