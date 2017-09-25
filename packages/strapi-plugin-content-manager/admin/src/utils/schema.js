import { forEach, upperFirst, mapValues, pickBy, slice, findKey, keys, get } from 'lodash';
import pluralize from 'pluralize';

/**
 * Generate a schema according to the models
 * of the Strapi application.
 *
 * @param models
 */
const generateSchema = (models) => {
  // Init `schema` object
  const schema = {};

  forEach(models, (model, name) => {
    // Model data
    const schemaModel = {
      label: upperFirst(name),
      labelPlural: upperFirst(pluralize(name)),
      orm: model.orm || 'mongoose',
    };

    // Fields (non relation)
    schemaModel.fields = mapValues(pickBy(model.attributes, attribute =>
      !attribute.model && !attribute.collection
    ), (value, attribute) => ({
      label: upperFirst(attribute),
      description: '',
      type: value.type || 'string',
    }));

    // Select fields displayed in list view
    schemaModel.list = slice(keys(schemaModel.fields), 0, 4);

    if (model.associations) {
      // Model relations
      schemaModel.relations = model.associations.reduce((acc, current) => {
        acc[current.alias] = {
          ...current,
          description: '',
          displayedAttribute: get(models[current.model || current.collection], 'info.mainField') ||
            findKey(models[current.model || current.collection].attributes, { type : 'string'}) ||
            'id',
        };

        return acc;
      }, {});
    }

    // Set the formatted model to the schema
    schema[name] = schemaModel;
  });

  return schema;
};

export {
  generateSchema,
};
