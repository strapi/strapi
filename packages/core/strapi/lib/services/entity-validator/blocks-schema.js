'use strict';

const { yup } = require('@strapi/utils');

const TextNodeSchema = yup.object().shape({
  type: yup.string().equals(['text']).required(),
  text: yup
    .string()
    .test('is-valid-text', 'Text must be defined with at least an empty string', (text) => {
      return typeof text === 'string' || text === '';
    }),
  bold: yup.boolean(),
  italic: yup.boolean(),
  underline: yup.boolean(),
  strikethrough: yup.boolean(),
  code: yup.boolean(),
});

const LinkNodeSchema = yup.object().shape({
  type: yup.string().equals(['link']).required(),
  url: yup.string().url().required(),
  children: yup.array().of(TextNodeSchema).required(),
});

const InlineNodeSchema = yup.lazy((value) => {
  switch (value.type) {
    case 'text':
      return TextNodeSchema;
    case 'link':
      return LinkNodeSchema;
    default:
      return yup.mixed().test('invalid-type', 'Inline node must be Text or Link', () => {
        return false;
      });
  }
});

const ParagraphNodeSchema = yup.object().shape({
  type: yup.string().equals(['paragraph']).required(),
  children: yup
    .array()
    .of(InlineNodeSchema)
    .min(1, 'Paragraph node children must have at least one Text or Link node')
    .required(),
});

const HeadingNodeSchema = yup.object().shape({
  type: yup.string().equals(['heading']).required(),
  level: yup.number().oneOf([1, 2, 3, 4, 5, 6]).required(),
  children: yup
    .array()
    .of(InlineNodeSchema)
    .min(1, 'Heading node children must have at least one Text or Link node')
    .required(),
});

const QuoteNodeSchema = yup.object().shape({
  type: yup.string().equals(['quote']).required(),
  children: yup
    .array()
    .of(InlineNodeSchema)
    .min(1, 'Quote node children must have at least one Text or Link node')
    .required(),
});

const CodeBlockSchema = yup.object().shape({
  type: yup.string().equals(['code']).required(),
  syntax: yup.string().nullable(),
  children: yup
    .array()
    .of(TextNodeSchema)
    .min(1, 'Quote node children must have at least one Text or Link node')
    .required(),
});

const ListItemNode = yup.object().shape({
  type: yup.string().equals(['list-item']).required(),
  children: yup.array().of(InlineNodeSchema).required(),
});

const ListNodeSchema = yup.object().shape({
  type: yup.string().equals(['list']).required(),
  format: yup.string().equals(['ordered', 'unordered']).required(),
  children: yup
    .array()
    .of(ListItemNode)
    .min(1, 'List node children must have at least one ListItem node')
    .required(),
});

const ImageNodeSchema = yup.object().shape({
  type: yup.string().equals(['image']).required(),
  image: yup.object().shape({
    name: yup.string().required(),
    alternativeText: yup.string().nullable(),
    url: yup.string().required(),
    caption: yup.string().nullable(),
    width: yup.number().required(),
    height: yup.number().required(),
    formats: yup.object().required(),
    hash: yup.string().required(),
    ext: yup.string().required(),
    mime: yup.string().required(),
    size: yup.number().required(),
    previewUrl: yup.string().nullable(),
    provider: yup.string().required(),
    provider_metadata: yup.mixed().nullable(),
    createdAt: yup.string().required(),
    updatedAt: yup.string().required(),
  }),
  children: yup.array().of(InlineNodeSchema).required(),
});

const BlockNodeSchema = yup.lazy((value) => {
  switch (value.type) {
    case 'paragraph':
      return ParagraphNodeSchema;
    case 'heading':
      return HeadingNodeSchema;
    case 'quote':
      return QuoteNodeSchema;
    case 'list':
      return ListNodeSchema;
    case 'image':
      return ImageNodeSchema;
    case 'code':
      return CodeBlockSchema;
    default:
      return yup
        .mixed()
        .test(
          'invalid-type',
          'Block node must be Paragraph, Heading, Quote, List, or Image',
          () => {
            return false;
          }
        );
  }
});

const StrapiBlocksSchema = yup.object({
  version: yup.string().required(),
  blocks: yup.array().of(BlockNodeSchema).required(),
});

module.exports = { StrapiBlocksSchema };
