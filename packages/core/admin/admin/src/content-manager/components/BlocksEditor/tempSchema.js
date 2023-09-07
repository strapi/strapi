export const blocksData = [
  // A paragraph with the text split into different sections, each with its own modifier
  {
    type: 'paragraph',
    children: [
      { text: 'This is editable ' },
      { text: 'rich', bold: true },
      { text: ' text, ' },
      { text: 'much', italic: true },
      { text: ' better than a ' },
      { text: '<textarea>', code: true },
      { text: '!' },
    ],
  },
  {
    type: 'paragraph',
    children: [
      { type: 'text', text: 'Hello', bold: true },
      { type: 'text', text: 'there.' },
      { type: 'text', text: 'It is me', italic: true },
      { type: 'text', text: 'Joe', underline: true, strikethrough: true },
      { type: 'text', text: 'Kai Doe', underline: true },
      {
        type: 'link',
        url: 'https://www.google.com/',
        children: [{ type: 'text', text: 'looking for', italic: true }],
      },
    ],
  },
  // A paragraph with combined text modifiers
  {
    type: 'paragraph',
    children: [
      {
        type: 'text',
        text: 'This is bold text',
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
  // {
  //   type: 'paragraph',
  //   children: [
  //     {
  //       type: 'image',
  //       image: {
  //         url: 'https://via.placeholder.com/300/09f/fff.png',
  //         name: 'Dummy-image.png',
  //         alternativeText: null,
  //         caption: null,
  //         width: 300,
  //         height: 300,
  //         formats: {
  //           thumbnail: {
  //             name: 'thumbnail_Screenshot 2023-08-22 at 10.33.50.png',
  //             hash: 'thumbnail_Screenshot_2023_08_22_at_10_33_50_ac7d5fd5b1',
  //             ext: '.png',
  //             mime: 'image/png',
  //             path: null,
  //             width: 150,
  //             height: 156,
  //             size: 10.31,
  //             url: '/uploads/thumbnail_Screenshot_2023_08_22_at_10_33_50_ac7d5fd5b1.png',
  //           },
  //           small: {
  //             name: 'small_Screenshot 2023-08-22 at 10.33.50.png',
  //             hash: 'small_Screenshot_2023_08_22_at_10_33_50_ac7d5fd5b1',
  //             ext: '.png',
  //             mime: 'image/png',
  //             path: null,
  //             width: 480,
  //             height: 500,
  //             size: 57.69,
  //             url: '/uploads/small_Screenshot_2023_08_22_at_10_33_50_ac7d5fd5b1.png',
  //           },
  //         },
  //         hash: 'Screenshot_2023_08_22_at_10_33_50_ac7d5fd5b1',
  //         ext: '.png',
  //         mime: 'image/png',
  //         size: 17.95,
  //         previewUrl: null,
  //         provider: 'local',
  //         provider_metadata: null,
  //         createdAt: '2023-08-24T09:43:30.065Z',
  //         updatedAt: '2023-08-24T09:43:30.065Z',
  //       },
  //     },
  //   ],
  // },
];
