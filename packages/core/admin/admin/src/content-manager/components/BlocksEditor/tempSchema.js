export const blocksData = [
  {
    type: 'paragraph',
    children: [
      { text: 'This is editable ' },
      { text: 'This is bold text', bold: true },
      { text: 'This is deleted text', strikethrough: true },
      { text: '<textarea>\n', code: true },
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
    type: 'code',
    children: [
      {
        type: 'text',
        text: '<SomeComponent />',
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
    type: 'image',
    children: [{ text: '' }], // for void elements this needs to be defined
    image: {
      url: 'https://via.placeholder.com/300/09f/fff.png',
      name: 'Dummy-image.png',
      alternativeText: null,
      caption: null,
      width: 300,
      height: 300,
    },
  },
];
