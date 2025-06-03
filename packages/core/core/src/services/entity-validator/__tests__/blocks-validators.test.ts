import strapiUtils, { errors } from '@strapi/utils';
import { Validators } from '../validators';

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
      {
        type: 'link',
        url: '/strapi',
        children: [{ type: 'text', text: 'Strapi relative link' }],
      },
      {
        type: 'link',
        url: 'mailto:info@strapi.io',
        children: [{ type: 'text', text: 'Strapi Email' }],
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
        Validators.blocks(
          {
            attr: { type: 'blocks' },
          },
          { isDraft: false }
        )
      );
      expect(await validator(validParagraph)).toEqual(validParagraph);
    });
    it('Should throw an error given an invalid paragraph schema', async () => {
      const validator = strapiUtils.validateYupSchema(
        Validators.blocks(
          {
            attr: { type: 'blocks' },
          },
          { isDraft: false }
        )
      );
      // Bad children
      await expect(validator([{ type: 'paragraph' }])).rejects.toThrow(errors.YupValidationError);
      // Bad modifier
      await expect(validator([{ type: 'paragraph', text: 'hi', break: true }])).rejects.toThrow(
        errors.YupValidationError
      );
      // Bad url
      await expect(
        validator([{ type: 'link', url: 'kaboom', children: [{ type: 'text', text: 'fail' }] }])
      ).rejects.toThrow(errors.YupValidationError);
    });
  });
  describe('Heading', () => {
    it('Should accept a valid paragraph schema', async () => {
      const validator = strapiUtils.validateYupSchema(
        Validators.blocks(
          {
            attr: { type: 'blocks' },
          },
          { isDraft: false }
        )
      );
      expect(await validator(validHeadings)).toEqual(validHeadings);
    });
    it('Should throw an error given an invalid heading schema', async () => {
      const validator = strapiUtils.validateYupSchema(
        Validators.blocks(
          {
            attr: { type: 'blocks' },
          },
          { isDraft: false }
        )
      );
      // Bad level
      await expect(
        validator([{ type: 'heading', level: 8, children: [{ type: 'text', text: 'Heading 8' }] }])
      ).rejects.toThrow(errors.YupValidationError);
      // Bad children
      await expect(
        validator([{ type: 'heading', level: 1, children: [{ type: 'image', text: 'Heading 8' }] }])
      ).rejects.toThrow(errors.YupValidationError);
    });
  });
  describe('Quote', () => {
    it('Should accept a valid quote schema', async () => {
      const validator = strapiUtils.validateYupSchema(
        Validators.blocks(
          {
            attr: { type: 'blocks' },
          },
          { isDraft: false }
        )
      );
      expect(await validator(validQuote)).toEqual(validQuote);
    });
    it('Should throw an error given an invalid quote schema', async () => {
      const validator = strapiUtils.validateYupSchema(
        Validators.blocks(
          {
            attr: { type: 'blocks' },
          },
          { isDraft: false }
        )
      );
      // Bad children
      await expect(
        validator([{ type: 'quote', children: [{ type: 'heading', text: 'Heading 8' }] }])
      ).rejects.toThrow(errors.YupValidationError);
    });
  });
  describe('List', () => {
    it('Should accept a valid list schema', async () => {
      const validator = strapiUtils.validateYupSchema(
        Validators.blocks(
          {
            attr: { type: 'blocks' },
          },
          { isDraft: false }
        )
      );
      expect(await validator(validLists)).toEqual(validLists);
    });
    it('Should throw an error given an invalid list schema', async () => {
      const validator = strapiUtils.validateYupSchema(
        Validators.blocks(
          {
            attr: { type: 'blocks' },
          },
          { isDraft: false }
        )
      );
      // Bad format
      await expect(
        validator([
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
        ])
      ).rejects.toThrow(errors.YupValidationError);
      // Bad children
      await expect(
        validator([
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
        ])
      ).rejects.toThrow(errors.YupValidationError);
    });
  });
  describe('Image', () => {
    it('Should accept a valid image schema', async () => {
      const validator = strapiUtils.validateYupSchema(
        Validators.blocks(
          {
            attr: { type: 'blocks' },
          },
          { isDraft: false }
        )
      );
      expect(await validator(validImage)).toEqual(validImage);
    });
    it('Should throw an error given an invalid image schema', async () => {
      const validator = strapiUtils.validateYupSchema(
        Validators.blocks(
          {
            attr: { type: 'blocks' },
          },
          { isDraft: false }
        )
      );
      // Bad image object
      await expect(
        validator([
          {
            type: 'image',
            children: [{ type: 'text', text: '' }],
            image: {
              name: null,
              url: null,
            },
          },
        ])
      ).rejects.toThrow(errors.YupValidationError);
    });
  });
  describe('Code', () => {
    it('Should accept a valid code schema', async () => {
      const validator = strapiUtils.validateYupSchema(
        Validators.blocks(
          {
            attr: { type: 'code' },
          },
          { isDraft: false }
        )
      );
      expect(await validator(validCodeBlock)).toEqual(validCodeBlock);
    });
    it('Should throw an error given an invalid code schema', async () => {
      const validator = strapiUtils.validateYupSchema(
        Validators.blocks(
          {
            attr: { type: 'code' },
          },
          { isDraft: false }
        )
      );
      // Bad children
      await expect(
        validator([
          {
            type: 'code',
            syntax: 'javascript',
            children: [{ type: 'link', text: 'const test = "whatever"' }],
          },
        ])
      ).rejects.toThrow(errors.YupValidationError);
    });
  });
  describe('Mixed', () => {
    it('Should accept a valid schema of mixed blocks', async () => {
      const validator = strapiUtils.validateYupSchema(
        Validators.blocks(
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
      expect(await validator(mixed)).toEqual(mixed);
    });
    it('Should throw an error given mixed valid and invalid blocks', () => {
      const validator = strapiUtils.validateYupSchema(
        Validators.blocks(
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
      expect(validator(mixed)).rejects.toThrow(errors.YupValidationError);
      // Bad version
      expect(validator(mixed)).rejects.toThrow(errors.YupValidationError);
    });
  });
});
