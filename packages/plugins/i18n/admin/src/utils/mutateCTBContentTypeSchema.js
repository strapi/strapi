import { has, get, omit } from 'lodash';
import LOCALIZED_FIELDS from './localizedFields';

const localizedPath = ['pluginOptions', 'i18n', 'localized'];

const addLocalisationToFields = attributes =>
  Object.keys(attributes).reduce((acc, current) => {
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

const disableAttributesLocalisation = attributes =>
  Object.keys(attributes).reduce((acc, current) => {
    acc[current] = omit(attributes[current], 'pluginOptions.i18n');

    return acc;
  }, {});

const mutateCTBContentTypeSchema = (nextSchema, prevSchema) => {
  // Don't perform mutations components
  if (!has(nextSchema, localizedPath)) {
    return nextSchema;
  }

  const isNextSchemaLocalized = get(nextSchema, localizedPath, false);
  const isPrevSchemaLocalized = get(prevSchema, ['schema', ...localizedPath], false);

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
export default mutateCTBContentTypeSchema;
export { addLocalisationToFields, disableAttributesLocalisation };
