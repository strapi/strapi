import omit from 'lodash/omit';

import { LOCALIZED_FIELDS, doesPluginOptionsHaveI18nLocalized } from './fields';

import type { Schema } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * mutateCTBContentTypeSchema
 * -----------------------------------------------------------------------------------------------*/

const mutateCTBContentTypeSchema = (
  nextSchema: Schema.ContentType,
  prevSchema?: {
    apiID?: string;
    schema?: Schema.ContentType;
    uid?: string;
  }
) => {
  // Don't perform mutations components
  if (!doesPluginOptionsHaveI18nLocalized(nextSchema.pluginOptions)) {
    return nextSchema;
  }

  const isNextSchemaLocalized = nextSchema.pluginOptions.i18n.localized;
  const isPrevSchemaLocalized = doesPluginOptionsHaveI18nLocalized(
    prevSchema?.schema?.pluginOptions
  )
    ? prevSchema?.schema?.pluginOptions.i18n.localized
    : false;

  // No need to perform modification on the schema, if the i18n feature was not changed
  // at the ct level
  if (isNextSchemaLocalized && isPrevSchemaLocalized) {
    return nextSchema;
  }

  if (isNextSchemaLocalized) {
    const attributes = addLocalisationToFields(nextSchema.attributes);

    return { ...nextSchema, attributes };
  }

  // Remove the i18n object from the pluginOptions
  if (!isNextSchemaLocalized) {
    const pluginOptions = omit(nextSchema.pluginOptions, 'i18n');
    const attributes = disableAttributesLocalisation(nextSchema.attributes);

    return { ...nextSchema, pluginOptions, attributes };
  }

  return nextSchema;
};

/* -------------------------------------------------------------------------------------------------
 * addLocalisationToFields
 * -----------------------------------------------------------------------------------------------*/

const addLocalisationToFields = (attributes: Schema.ContentType['attributes']) =>
  Object.keys(attributes).reduce<Schema.ContentType['attributes']>((acc, current) => {
    const currentAttribute = attributes[current];

    if (LOCALIZED_FIELDS.includes(currentAttribute.type)) {
      const i18n = { localized: true };

      const pluginOptions = currentAttribute.pluginOptions
        ? { ...currentAttribute.pluginOptions, i18n }
        : { i18n };

      acc[current] = { ...currentAttribute, pluginOptions };

      return acc;
    }

    acc[current] = currentAttribute;

    return acc;
  }, {});

/* -------------------------------------------------------------------------------------------------
 * disableAttributesLocalisation
 * -----------------------------------------------------------------------------------------------*/

type OmitByPath<T extends object, K extends string[]> = Pick<T, Exclude<keyof T, K[number]>>;

const disableAttributesLocalisation = (attributes: Schema.ContentType['attributes']) =>
  Object.keys(attributes).reduce<
    Record<string, OmitByPath<Schema.ContentType['attributes'][string], ['pluginOptions', 'i18n']>>
  >((acc, current) => {
    acc[current] = omit(attributes[current], 'pluginOptions.i18n');

    return acc;
  }, {});

export { mutateCTBContentTypeSchema };
