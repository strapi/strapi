'use strict';

const { yup } = require('@strapi/utils');

const textNodeValidator = yup.object().shape({
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

const linkNodeValidator = yup.object().shape({
  type: yup.string().equals(['link']).required(),
  url: yup.string().url().required(),
  children: yup.array().of(textNodeValidator).required(),
});

const inlineNodeValidator = yup.lazy((value) => {
  switch (value.type) {
    case 'text':
      return textNodeValidator;
    case 'link':
      return linkNodeValidator;
    default:
      return yup.mixed().test('invalid-type', 'Inline node must be Text or Link', () => {
        return false;
      });
  }
});

const paragraphNodeValidator = yup.object().shape({
  type: yup.string().equals(['paragraph']).required(),
  children: yup
    .array()
    .of(inlineNodeValidator)
    .min(1, 'Paragraph node children must have at least one Text or Link node')
    .required(),
});

const headingNodeValidator = yup.object().shape({
  type: yup.string().equals(['heading']).required(),
  level: yup.number().oneOf([1, 2, 3, 4, 5, 6]).required(),
  children: yup
    .array()
    .of(inlineNodeValidator)
    .min(1, 'Heading node children must have at least one Text or Link node')
    .required(),
});

const quoteNodeValidator = yup.object().shape({
  type: yup.string().equals(['quote']).required(),
  children: yup
    .array()
    .of(inlineNodeValidator)
    .min(1, 'Quote node children must have at least one Text or Link node')
    .required(),
});

const codeBlockValidator = yup.object().shape({
  type: yup.string().equals(['code']).required(),
  syntax: yup.string().nullable(),
  children: yup
    .array()
    .of(textNodeValidator)
    .min(1, 'Quote node children must have at least one Text or Link node')
    .required(),
});

const listItemNode = yup.object().shape({
  type: yup.string().equals(['list-item']).required(),
  children: yup.array().of(inlineNodeValidator).required(),
});

const listNodeValidator = yup.object().shape({
  type: yup.string().equals(['list']).required(),
  format: yup.string().equals(['ordered', 'unordered']).required(),
  children: yup
    .array()
    .of(listItemNode)
    .min(1, 'List node children must have at least one ListItem node')
    .required(),
});

const imageNodeValidator = yup.object().shape({
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
  children: yup.array().of(inlineNodeValidator).required(),
});

const blockNodeValidator = yup.lazy((value) => {
  switch (value.type) {
    case 'paragraph':
      return paragraphNodeValidator;
    case 'heading':
      return headingNodeValidator;
    case 'quote':
      return quoteNodeValidator;
    case 'list':
      return listNodeValidator;
    case 'image':
      return imageNodeValidator;
    case 'code':
      return codeBlockValidator;
    default:
      return yup.mixed().test('invalid-type', 'Block node is of invalid type', () => {
        return false;
      });
  }
});

// See: https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
const semverRegex =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/gm;
const blocksValidator = yup.object({
  version: yup.string().matches(semverRegex, 'Invalid version').required(),
  blocks: yup.array().of(blockNodeValidator).required(),
});

module.exports = () => blocksValidator;
