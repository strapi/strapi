import { describe, it, expect } from 'vitest';
import * as strapiUtils from '@strapi/utils';
import { Validators } from '../validators';
import { customBlockValidators } from '../blocks-validator';

const { errors, yup } = strapiUtils;

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
const validImageWithNullFormats = [
  {
    type: 'image',
    children: [{ type: 'text', text: '' }],
    image: {
      ...validImage[0].image,
      formats: null,
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
    language: 'javascript',
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

    it.each([
      ['java', 'script:alert(1)'].join(''),
      'VbScRiPt:msgbox(1)',
      'DATA:text/html,alert(1)',
      ' \tJaVaScRiPt:alert(1)',
      '%6aavascript:alert(1)',
    ])('rejects the unsafe URL scheme %s in link nodes', async (url) => {
      const validator = strapiUtils.validateYupSchema(
        Validators.blocks(
          {
            attr: { type: 'blocks' },
          },
          { isDraft: false }
        )
      );

      await expect(
        validator([
          {
            type: 'paragraph',
            children: [
              {
                type: 'link',
                url,
                children: [{ type: 'text', text: 'Click me' }],
              },
            ],
          },
        ])
      ).rejects.toThrow(errors.YupValidationError);
    });

    it.each(['ftp://example.com', 'tel:+15555550123', '//example.com'])(
      'accepts %s',
      async (url) => {
        const validator = strapiUtils.validateYupSchema(
          Validators.blocks(
            {
              attr: { type: 'blocks' },
            },
            { isDraft: false }
          )
        );

        const value = [
          {
            type: 'paragraph',
            children: [{ type: 'link', url, children: [{ type: 'text', text: 'Click me' }] }],
          },
        ];

        await expect(validator(value)).resolves.toEqual(value);
      }
    );
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
    it('Should accept an image with null formats (small image without responsive formats)', async () => {
      const validator = strapiUtils.validateYupSchema(
        Validators.blocks(
          {
            attr: { type: 'blocks' },
          },
          { isDraft: false }
        )
      );
      expect(await validator(validImageWithNullFormats)).toEqual(validImageWithNullFormats);
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
            language: 'javascript',
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

  describe('Custom block validators', () => {
    afterEach(() => {
      // Reset the global registry between tests
      customBlockValidators.clear();
    });

    describe('Registry API', () => {
      it('should register and retrieve a custom block validator', () => {
        const calloutValidator = yup.object().shape({
          type: yup.string().equals(['callout']).required(),
          children: yup.array().required(),
        });

        customBlockValidators.add('callout', calloutValidator);
        expect(customBlockValidators.has('callout')).toBe(true);
        expect(customBlockValidators.get('callout')).toBe(calloutValidator);
      });

      it('should throw when registering a duplicate type', () => {
        const validator = yup.object().shape({
          type: yup.string().equals(['callout']).required(),
        });
        customBlockValidators.add('callout', validator);

        expect(() => customBlockValidators.add('callout', validator)).toThrow(
          'A custom block validator for type "callout" has already been registered'
        );
      });

      it('should throw when registering with an empty string type', () => {
        const validator = yup.object();
        expect(() => customBlockValidators.add('', validator)).toThrow(
          'Custom block validator requires a non-empty string `type`'
        );
      });

      it('should delete a registered custom block validator', () => {
        const validator = yup.object();
        customBlockValidators.add('callout', validator);
        expect(customBlockValidators.delete('callout')).toBe(true);
        expect(customBlockValidators.has('callout')).toBe(false);
      });

      it('should return false when deleting a non-existent type', () => {
        expect(customBlockValidators.delete('nonexistent')).toBe(false);
      });

      it('should clear all registered validators', () => {
        customBlockValidators.add('callout', yup.object());
        customBlockValidators.add('alert', yup.object());
        customBlockValidators.clear();
        expect(customBlockValidators.has('callout')).toBe(false);
        expect(customBlockValidators.has('alert')).toBe(false);
      });
    });

    describe('Validation', () => {
      it('should accept a valid custom block when its validator is registered', async () => {
        const calloutValidator = yup.object().shape({
          type: yup.string().equals(['callout']).required(),
          children: yup
            .array()
            .of(
              yup.object().shape({
                type: yup.string().equals(['text']).required(),
                text: yup.string(),
              })
            )
            .min(1)
            .required(),
        });
        customBlockValidators.add('callout', calloutValidator);

        const validator = strapiUtils.validateYupSchema(
          Validators.blocks(
            {
              attr: { type: 'blocks' },
            },
            { isDraft: false }
          )
        );

        const input = [
          {
            type: 'callout',
            children: [{ type: 'text', text: 'Important note' }],
          },
        ];

        expect(await validator(input)).toEqual(input);
      });

      it('should accept custom blocks mixed with built-in blocks', async () => {
        const calloutValidator = yup.object().shape({
          type: yup.string().equals(['callout']).required(),
          children: yup
            .array()
            .of(
              yup.object().shape({
                type: yup.string().equals(['text']).required(),
                text: yup.string(),
              })
            )
            .min(1)
            .required(),
        });
        customBlockValidators.add('callout', calloutValidator);

        const validator = strapiUtils.validateYupSchema(
          Validators.blocks(
            {
              attr: { type: 'blocks' },
            },
            { isDraft: false }
          )
        );

        const input = [
          ...validParagraph,
          {
            type: 'callout',
            children: [{ type: 'text', text: 'Important note' }],
          },
        ];

        expect(await validator(input)).toEqual(input);
      });

      it('should reject a custom block that does not match its registered schema', () => {
        const calloutValidator = yup.object().shape({
          type: yup.string().equals(['callout']).required(),
          children: yup.array().min(1).required(),
        });
        customBlockValidators.add('callout', calloutValidator);

        const validator = strapiUtils.validateYupSchema(
          Validators.blocks(
            {
              attr: { type: 'blocks' },
            },
            { isDraft: false }
          )
        );

        // Missing required children
        const input = [{ type: 'callout' }];
        expect(validator(input)).rejects.toThrow(errors.YupValidationError);
      });

      it('should still reject a completely unknown block type', () => {
        const validator = strapiUtils.validateYupSchema(
          Validators.blocks(
            {
              attr: { type: 'blocks' },
            },
            { isDraft: false }
          )
        );

        const input = [
          {
            type: 'unknown-block',
            children: [{ type: 'text', text: 'test' }],
          },
        ];

        expect(validator(input)).rejects.toThrow(errors.YupValidationError);
      });

      it('should reject a custom block with invalid nested children', () => {
        // Register a validator that requires children to be text nodes
        const calloutValidator = yup.object().shape({
          type: yup.string().equals(['callout']).required(),
          children: yup
            .array()
            .of(
              yup.object().shape({
                type: yup.string().equals(['text']).required(),
                text: yup.string().required(),
              })
            )
            .min(1)
            .required(),
        });
        customBlockValidators.add('callout', calloutValidator);

        const validator = strapiUtils.validateYupSchema(
          Validators.blocks(
            {
              attr: { type: 'blocks' },
            },
            { isDraft: false }
          )
        );

        // Children contain an invalid node type
        const input = [
          {
            type: 'callout',
            children: [{ type: 'invalid-child', value: 42 }],
          },
        ];

        expect(validator(input)).rejects.toThrow(errors.YupValidationError);
      });
    });
  });
});
