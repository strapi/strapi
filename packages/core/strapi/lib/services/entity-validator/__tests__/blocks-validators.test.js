'use strict';

const strapiUtils = require('@strapi/utils');
const {
  errors: { YupValidationError },
} = require('@strapi/utils');
const validators = require('../validators');

const validParagraph = [
  {
    type: 'paragraph',
    children: [
      { type: 'text', text: 'test' },
      { type: 'text', text: '' },
      {
        type: 'text',
        text: 'plop',
        bold: true,
        italic: false,
        underline: true,
        strikethrough: false,
        code: true,
      },
      {
        type: 'link',
        url: 'https://strapi.io',
        children: [{ type: 'text', text: 'Strapi' }],
      },
    ],
  },
];

const validImage = [
  {
    type: 'image',
    children: [{ type: 'text', text: '' }],
    image: {
      name: 'Screenshot 2023-08-22 at 10.33.50.png',
      alternativeText: null,
      url: '/uploads/Screenshot_2023_08_22_at_10_33_50_ac7d5fd5b1.png',
      caption: null,
      width: 665,
      height: 692,
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
    },
  },
];

const validQuote = [
  {
    type: 'quote',
    children: [
      {
        type: 'text',
        text: 'This is a quote',
      },
      {
        type: 'link',
        url: 'https://strapi.io',
        children: [
          {
            type: 'text',
            text: 'Strapi',
          },
        ],
      },
    ],
  },
];

const validHeadings = [
  {
    type: 'heading',
    level: 1,
    children: [{ type: 'text', text: 'Heading 1' }],
  },
  {
    type: 'heading',
    level: 6,
    children: [
      {
        type: 'link',
        url: 'https://strapi.io',
        children: [{ type: 'text', text: 'Heading 2' }],
      },
    ],
  },
  {
    type: 'heading',
    level: 3,
    children: [
      {
        type: 'text',
        text: 'My cool',
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
];

const validLists = [
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
];

const validCodeBlock = [
  {
    type: 'code',
    syntax: 'javascript',
    children: [{ type: 'text', text: 'const test = "whatever"' }],
  },
];

describe('Blocks validator', () => {
  describe('Paragraph', () => {
    it('Should accept a valid paragraph schema', async () => {
      const validator = strapiUtils.validateYupSchema(
        validators.blocks(
          {
            attr: { type: 'blocks' },
          },
          { isDraft: false }
        )
      );

      expect(await validator({ version: '0.0.0', blocks: validParagraph })).toEqual({
        version: '0.0.0',
        blocks: validParagraph,
      });
    });

    it('Should throw an error given an invalid paragraph schema', async () => {
      const validator = strapiUtils.validateYupSchema(
        validators.blocks(
          {
            attr: { type: 'blocks' },
          },
          { isDraft: false }
        )
      );

      // Bad children
      await expect(
        validator({ version: '0.0.0', blocks: [{ type: 'paragraph' }] })
      ).rejects.toThrow(YupValidationError);
      // Bad modifier
      await expect(
        validator({ version: '0.0.0', blocks: [{ type: 'paragraph', text: 'hi', break: true }] })
      ).rejects.toThrow(YupValidationError);
      // Bad url
      await expect(
        validator({
          version: '0.0.0',
          blocks: [{ type: 'link', url: 'kaboom', children: [{ type: 'text', text: 'fail' }] }],
        })
      ).rejects.toThrow(YupValidationError);
    });
  });

  describe('Heading', () => {
    it('Should accept a valid paragraph schema', async () => {
      const validator = strapiUtils.validateYupSchema(
        validators.blocks(
          {
            attr: { type: 'blocks' },
          },
          { isDraft: false }
        )
      );

      expect(await validator({ version: '0.0.0', blocks: validHeadings })).toEqual({
        version: '0.0.0',
        blocks: validHeadings,
      });
    });

    it('Should throw an error given an invalid heading schema', async () => {
      const validator = strapiUtils.validateYupSchema(
        validators.blocks(
          {
            attr: { type: 'blocks' },
          },
          { isDraft: false }
        )
      );

      // Bad level
      await expect(
        validator({
          version: '0.0.0',
          blocks: [{ type: 'heading', level: 8, children: [{ type: 'text', text: 'Heading 8' }] }],
        })
      ).rejects.toThrow(YupValidationError);
      // Bad children
      await expect(
        validator({
          version: '0.0.0',
          blocks: [{ type: 'heading', level: 1, children: [{ type: 'image', text: 'Heading 8' }] }],
        })
      ).rejects.toThrow(YupValidationError);
    });
  });

  describe('Quote', () => {
    it('Should accept a valid quote schema', async () => {
      const validator = strapiUtils.validateYupSchema(
        validators.blocks(
          {
            attr: { type: 'blocks' },
          },
          { isDraft: false }
        )
      );

      expect(await validator({ version: '0.0.0', blocks: validQuote })).toEqual({
        version: '0.0.0',
        blocks: validQuote,
      });
    });

    it('Should throw an error given an invalid quote schema', async () => {
      const validator = strapiUtils.validateYupSchema(
        validators.blocks(
          {
            attr: { type: 'blocks' },
          },
          { isDraft: false }
        )
      );

      // Bad children
      await expect(
        validator({
          version: '0.0.0',
          blocks: [{ type: 'quote', children: [{ type: 'heading', text: 'Heading 8' }] }],
        })
      ).rejects.toThrow(YupValidationError);
    });
  });

  describe('List', () => {
    it('Should accept a valid list schema', async () => {
      const validator = strapiUtils.validateYupSchema(
        validators.blocks(
          {
            attr: { type: 'blocks' },
          },
          { isDraft: false }
        )
      );

      expect(await validator({ version: '0.0.0', blocks: validLists })).toEqual({
        version: '0.0.0',
        blocks: validLists,
      });
    });

    it('Should throw an error given an invalid list schema', async () => {
      const validator = strapiUtils.validateYupSchema(
        validators.blocks(
          {
            attr: { type: 'blocks' },
          },
          { isDraft: false }
        )
      );

      // Bad format
      await expect(
        validator({
          version: '0.0.0',
          blocks: [
            {
              type: 'list',
              format: 'bad',
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
              ],
            },
          ],
        })
      ).rejects.toThrow(YupValidationError);

      // Bad children
      await expect(
        validator({
          version: '0.0.0',
          blocks: [
            {
              type: 'list',
              format: 'ordered',
              children: [
                {
                  type: 'heading',
                  children: [
                    {
                      type: 'text',
                      level: 1,
                      children: [{ type: 'text', text: 'First item' }],
                    },
                  ],
                },
              ],
            },
          ],
        })
      ).rejects.toThrow(YupValidationError);
    });
  });

  describe('Image', () => {
    it('Should accept a valid image schema', async () => {
      const validator = strapiUtils.validateYupSchema(
        validators.blocks(
          {
            attr: { type: 'blocks' },
          },
          { isDraft: false }
        )
      );

      expect(await validator({ version: '0.0.0', blocks: validImage })).toEqual({
        version: '0.0.0',
        blocks: validImage,
      });
    });

    it('Should throw an error given an invalid image schema', async () => {
      const validator = strapiUtils.validateYupSchema(
        validators.blocks(
          {
            attr: { type: 'blocks' },
          },
          { isDraft: false }
        )
      );
      // Bad image object
      await expect(
        validator({
          version: '0.0.0',
          blocks: [
            {
              type: 'image',
              children: [{ type: 'text', text: '' }],
              image: {
                name: null,
                url: null,
              },
            },
          ],
        })
      ).rejects.toThrow(YupValidationError);
    });
  });

  describe('Code', () => {
    it('Should accept a valid code schema', async () => {
      const validator = strapiUtils.validateYupSchema(
        validators.blocks(
          {
            attr: { type: 'code' },
          },
          { isDraft: false }
        )
      );

      expect(
        await validator({
          version: '0.0.0',
          blocks: validCodeBlock,
        })
      ).toEqual({
        version: '0.0.0',
        blocks: validCodeBlock,
      });
    });

    it('Should throw an error given an invalid code schema', async () => {
      const validator = strapiUtils.validateYupSchema(
        validators.blocks(
          {
            attr: { type: 'code' },
          },
          { isDraft: false }
        )
      );

      // Bad children
      await expect(
        validator({
          version: '0.0.0',
          blocks: [
            {
              type: 'code',
              syntax: 'javascript',
              children: [{ type: 'link', text: 'const test = "whatever"' }],
            },
          ],
        })
      ).rejects.toThrow(YupValidationError);
    });
  });

  describe('Mixed', () => {
    it('Should accept a valid schema of mixed blocks', async () => {
      const validator = strapiUtils.validateYupSchema(
        validators.blocks(
          {
            attr: { type: 'blocks' },
          },
          { isDraft: false }
        )
      );
      const mixed = [
        ...validParagraph,
        ...validImage,
        ...validQuote,
        ...validHeadings,
        ...validLists,
      ];
      expect(await validator({ version: '0.0.0', blocks: mixed })).toEqual({
        version: '0.0.0',
        blocks: mixed,
      });
    });

    it('Should throw an error given mixed valid and invalid blocks', () => {
      const validator = strapiUtils.validateYupSchema(
        validators.blocks(
          {
            attr: { type: 'blocks' },
          },
          { isDraft: false }
        )
      );

      const mixed = [
        ...validParagraph,
        ...validImage,
        ...validQuote,
        ...validHeadings,
        {
          type: 'list',
          format: 'ordered',
          children: [
            {
              type: 'heading',
              children: [
                {
                  type: 'text',
                  level: 1,
                  children: [{ type: 'text', text: 'First item' }],
                },
              ],
            },
          ],
        },
        {
          type: 'image',
          children: [{ type: 'text', text: '' }],
          image: {
            name: null,
            url: null,
          },
        },
      ];

      // Bad blocks
      expect(validator({ version: '0.0.0', blocks: mixed })).rejects.toThrow(YupValidationError);
      // Bad version
      expect(validator({ version: 'fail', blocks: mixed })).rejects.toThrow(YupValidationError);
    });
  });
});
