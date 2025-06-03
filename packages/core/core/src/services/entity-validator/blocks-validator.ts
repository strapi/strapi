import { yup } from '@strapi/utils';

const textNodeValidator = yup.object().shape({
  type: yup.string().equals(['text']).required(),
  text: yup
    .string()
    .test(
      'is-valid-text',
      'Text must be defined with at least an empty string',
      (text: unknown) => {
        return typeof text === 'string' || text === '';
      }
    ),
  bold: yup.boolean(),
  italic: yup.boolean(),
  underline: yup.boolean(),
  strikethrough: yup.boolean(),
  code: yup.boolean(),
});

const checkValidLink = (link: string) => {
  try {
    // eslint-disable-next-line no-new
    new URL(link.startsWith('/') ? `https://strapi.io${link}` : link);
  } catch (error) {
    return false;
  }
  return true;
};

const linkNodeValidator = yup.object().shape({
  type: yup.string().equals(['link']).required(),
  url: yup
    .string()
    .test('invalid-url', 'Please specify a valid link.', (value) => checkValidLink(value ?? '')),
  children: yup.array().of(textNodeValidator).required(),
});

// TODO: remove any with a correct Type
const inlineNodeValidator: any = yup.lazy((value: { type: string }) => {
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

// Allow children to be either a listItemNode or a listNode itself
// @ts-expect-error - listChildrenValidator needs a type
const listChildrenValidator = yup.lazy((value: { type: string }) => {
  switch (value.type) {
    case 'list':
      return listNodeValidator;
    case 'list-item':
      return listItemNode;
    default:
      return yup.mixed().test('invalid-type', 'Inline node must be list-item or list', () => {
        return false;
      });
  }
});

// @ts-expect-error - listNodeValidator needs a type
const listNodeValidator = yup.object().shape({
  type: yup.string().equals(['list']).required(),
  format: yup.string().equals(['ordered', 'unordered']).required(),
  children: yup
    .array()
    .of(listChildrenValidator)
    .min(1, 'List node children must have at least one ListItem or ListNode')
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

// TODO: remove the any and replace with a correct Type
const blockNodeValidator: any = yup.lazy((value: { type: string }) => {
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

const blocksValidatorSchema = yup.array().of(blockNodeValidator);

export const blocksValidator = () => blocksValidatorSchema;
