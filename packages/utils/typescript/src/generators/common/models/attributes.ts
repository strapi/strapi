import * as ts from 'typescript';
import _ from 'lodash';

import { addImport } from '../imports';
import { getTypeNode, toTypeLiteral, withAttributeNamespace, NAMESPACES } from './utils';
import type { Attribute, Schema } from './utils';
import { mappers } from './mappers';

const { factory } = ts;

/**
 * Create the base type node for a given attribute
 */
export const getAttributeType = (
  attributeName: string,
  attribute: Attribute,
  uid?: string
): ts.TypeReferenceNode | null => {
  if (!Object.keys(mappers).includes(attribute.type)) {
    console.warn(
      `"${attributeName}" attribute from "${uid}" has an invalid type: "${attribute.type}"`
    );

    return null;
  }

  const [attributeType, typeParams] = mappers[attribute.type]({ uid, attribute, attributeName });

  // Make sure the schema namespace is imported
  addImport(NAMESPACES.Schema);

  return getTypeNode(attributeType, typeParams);
};

/**
 * Options of the attribute generators.
 */
export type AttributeOptions = {
  /**
   * Whether the application enables `typescript.strictTypes`. Strict-only modifiers, such as
   * `Schema.Attribute.Conditional`, are emitted only then, so generated files without strict types
   * stay as in previous releases.
   */
  strict?: boolean;
};

/**
 * Collect every modifier node from an attribute
 */
export const getAttributeModifiers = (
  attribute: Attribute,
  { strict = false }: AttributeOptions = {}
): ts.TypeNode[] => {
  const modifiers: ts.TypeNode[] = [];

  // Required
  if (attribute.required) {
    modifiers.push(
      factory.createTypeReferenceNode(factory.createIdentifier(withAttributeNamespace('Required')))
    );
  }

  // Private
  if (attribute.private) {
    modifiers.push(
      factory.createTypeReferenceNode(factory.createIdentifier(withAttributeNamespace('Private')))
    );
  }

  // Unique
  if (attribute.unique) {
    modifiers.push(
      factory.createTypeReferenceNode(factory.createIdentifier(withAttributeNamespace('Unique')))
    );
  }

  // Configurable
  if (attribute.configurable) {
    modifiers.push(
      factory.createTypeReferenceNode(
        factory.createIdentifier(withAttributeNamespace('Configurable'))
      )
    );
  }

  // Custom field
  if (attribute.customField) {
    const customFieldUid = factory.createStringLiteral(attribute.customField);
    const typeArguments: any[] = [customFieldUid];

    if (attribute.options) {
      typeArguments.push(toTypeLiteral(attribute.options));
    }

    modifiers.push(
      factory.createTypeReferenceNode(
        factory.createIdentifier(withAttributeNamespace('CustomField')),
        typeArguments
      )
    );
  }

  // Plugin Options
  if (!_.isEmpty(attribute.pluginOptions)) {
    modifiers.push(
      factory.createTypeReferenceNode(
        factory.createIdentifier(withAttributeNamespace('SetPluginOptions')),
        // Transform the pluginOptions object into an object literal expression
        [toTypeLiteral(attribute.pluginOptions)]
      )
    );
  }

  // Min / Max
  if (attribute.min != null || attribute.max != null) {
    const minMaxProperties = _.pick(attribute, ['min', 'max']);
    const { min, max } = minMaxProperties;

    const typeofMin = typeof min;
    const typeofMax = typeof max;

    // Throws error if min/max exist but have different types to prevent unexpected behavior
    if (min !== undefined && max !== undefined && typeofMin !== typeofMax) {
      throw new Error('typeof min/max values mismatch');
    }

    let typeKeyword: any;

    // use 'string'
    if (typeofMin === 'string' || typeofMax === 'string') {
      typeKeyword = ts.SyntaxKind.StringKeyword;
    }
    // use 'number'
    else if (typeofMin === 'number' || typeofMax === 'number') {
      typeKeyword = ts.SyntaxKind.NumberKeyword;
    }
    // invalid type
    else {
      throw new Error(
        `Invalid data type for min/max options. Must be string, number or undefined, but found { min: ${min} (${typeofMin}), max: ${max} (${typeofMax}) }`
      );
    }

    modifiers.push(
      factory.createTypeReferenceNode(
        factory.createIdentifier(withAttributeNamespace('SetMinMax')),
        [toTypeLiteral(minMaxProperties), factory.createKeywordTypeNode(typeKeyword)]
      )
    );
  }

  // Min length / Max length
  if (attribute.minLength != null || attribute.maxLength != null) {
    const minMaxProperties = _.pick(attribute, ['minLength', 'maxLength']);

    modifiers.push(
      factory.createTypeReferenceNode(
        factory.createIdentifier(withAttributeNamespace('SetMinMaxLength')),
        [toTypeLiteral(minMaxProperties)]
      )
    );
  }

  // Conditional (strict types only): a field hidden by its `conditions.visible` rule skips
  // validation, so the strict write inputs make it optional and nullable
  if (strict === true && attribute.conditions?.visible !== undefined) {
    modifiers.push(
      factory.createTypeReferenceNode(
        factory.createIdentifier(withAttributeNamespace('Conditional'))
      )
    );
  }

  // Default (ignore if default is a function)
  if (attribute.default != null && typeof attribute.default !== 'function') {
    const defaultLiteral = toTypeLiteral(attribute.default);

    modifiers.push(
      factory.createTypeReferenceNode(
        factory.createIdentifier(withAttributeNamespace('DefaultTo')),
        [defaultLiteral]
      )
    );
  }

  return modifiers;
};

/**
 * Whether the attribute is a list of components: a repeatable component or a dynamic zone.
 */
const isComponentList = (attribute: Attribute) =>
  attribute.type === 'dynamiczone' ||
  (attribute.type === 'component' && attribute.repeatable === true);

/**
 * The write rule of an attribute, as one sentence for its JSDoc, or `undefined` when the attribute
 * has none to tell. It mirrors the strict write inputs of `@strapi/types`
 * (`modules/documents/params/write.ts`), which follow the entity validator of `@strapi/core`.
 *
 * `draftAndPublish` is `undefined` for a component: its fields follow the mode of the parent entry.
 */
export const getAttributeWriteRule = (
  attribute: Attribute,
  { draftAndPublish }: { draftAndPublish?: boolean } = {}
): string | undefined => {
  // The validator skips attributes that are not writable
  if (attribute.writable === false) {
    return undefined;
  }

  const hasDefault =
    attribute.default !== undefined &&
    attribute.default !== null &&
    typeof attribute.default !== 'function';
  // `*/` in a default value would end the comment
  const defaultRule =
    hasDefault === true
      ? `Default: ${JSON.stringify(attribute.default).replaceAll('*/', String.raw`*\/`)}.`
      : '';

  if (attribute.required !== true) {
    if (isComponentList(attribute) === true) {
      return 'Never `null`.';
    }

    return hasDefault === true ? defaultRule : undefined;
  }

  if (attribute.conditions?.visible !== undefined) {
    return 'Required only when its condition shows it.';
  }

  if (isComponentList(attribute) === true) {
    return 'Required on every create, drafts included (`[]` is enough). Never `null`.';
  }

  if (attribute.type === 'relation' || attribute.type === 'media') {
    return 'Required when published, only with `api.documents.strictRelations`.';
  }

  if (draftAndPublish === false) {
    return hasDefault === true ? `${defaultRule} Never \`null\`.` : 'Required. Never `null`.';
  }

  return hasDefault === true
    ? `${defaultRule} \`null\` only in drafts.`
    : 'Required when published. `null` only in drafts.';
};

/**
 * Generate a property signature node for a given attribute
 */
export const attributeToPropertySignature = (
  schema: Schema,
  attributeName: string,
  attribute: Attribute,
  options: AttributeOptions = {}
): ts.PropertySignature | null => {
  const baseType = getAttributeType(attributeName, attribute, schema.uid);

  if (baseType === null) {
    return null;
  }

  const modifiers = getAttributeModifiers(attribute, options);

  const nodes = [baseType, ...modifiers];

  const signature = factory.createPropertySignature(
    undefined,
    factory.createIdentifier(attributeName),
    undefined,
    factory.createIntersectionTypeNode(nodes)
  );

  // Strict types only: editors show the write rule on the attribute and on the input keys
  if (options.strict === true) {
    const rule = getAttributeWriteRule(attribute, {
      draftAndPublish:
        schema.modelType === 'contentType' ? schema.options?.draftAndPublish === true : undefined,
    });

    if (rule !== undefined) {
      ts.addSyntheticLeadingComment(
        signature,
        ts.SyntaxKind.MultiLineCommentTrivia,
        `* ${rule} `,
        true
      );
    }
  }

  return signature;
};

export { mappers };
