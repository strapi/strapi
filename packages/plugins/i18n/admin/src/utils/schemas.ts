import omit from 'lodash/omit';

import { LOCALIZED_FIELDS, doesPluginOptionsHaveI18nLocalized } from './fields';

import type { Schema } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * mutateCTBContentTypeSchema
 * -----------------------------------------------------------------------------------------------*/

// TODO: refactor for CTB refactors
const mutateCTBContentTypeSchema = (
  nextSchema: {
    pluginOptions: Schema.ContentType['pluginOptions'];
    attributes: Schema.Attribute.AnyAttribute[];
    uid?: string;
  },
  prevSchema?: {
    pluginOptions: Schema.ContentType['pluginOptions'];
    attributes: Schema.Attribute.AnyAttribute[];
    uid?: string;
  }
) => {
  if (!prevSchema) {
    return nextSchema;
  }

  // Don't perform mutations components
  if (!doesPluginOptionsHaveI18nLocalized(nextSchema.pluginOptions)) {
    return nextSchema;
  }

  const isNextSchemaLocalized = nextSchema.pluginOptions.i18n.localized;
  const isPrevSchemaLocalized = doesPluginOptionsHaveI18nLocalized(prevSchema?.pluginOptions)
    ? prevSchema?.pluginOptions.i18n.localized
    : false;

  // No need to perform modification on the schema, if the i18n feature was not changed
  // at the ct level
  if (isNextSchemaLocalized && isPrevSchemaLocalized) {
    return nextSchema;
  }

  if (isNextSchemaLocalized) {
    const attributes = addLocalisationToFields(nextSchema.attributes);

    return {
      ...nextSchema,
      attributes,
    };
  }

  // Remove the i18n object from the pluginOptions
  if (!isNextSchemaLocalized) {
    const pluginOptions = omit(nextSchema.pluginOptions, 'i18n');
    const attributes = disableAttributesLocalisation(nextSchema.attributes);

    return {
      ...nextSchema,
      pluginOptions,
      attributes,
    };
  }

  return nextSchema;
};

/* -------------------------------------------------------------------------------------------------
 * addLocalisationToFields
 * -----------------------------------------------------------------------------------------------*/

const addLocalisationToFields = (attributes: Schema.Attribute.AnyAttribute[]) => {
  return attributes.map((currentAttribute) => {
    if (LOCALIZED_FIELDS.includes(currentAttribute.type)) {
      const i18n = { localized: true };

      const pluginOptions = currentAttribute.pluginOptions
        ? { ...currentAttribute.pluginOptions, i18n }
        : { i18n };

      return { ...currentAttribute, pluginOptions };
    }

    return currentAttribute;
  });
};

/* -------------------------------------------------------------------------------------------------
 * disableAttributesLocalisation
 * -----------------------------------------------------------------------------------------------*/

const disableAttributesLocalisation = (attributes: Schema.Attribute.AnyAttribute[]) => {
  return attributes.map((currentAttribute) => {
    return omit(currentAttribute, 'pluginOptions.i18n');
  });
};

export { mutateCTBContentTypeSchema };
