import { forEach, upperFirst, mapValues, pickBy, slice, findKey, keys, get, set } from 'lodash';
import pluralize from 'pluralize';

/**
 * Generate a schema according to the models
 * of the Strapi application.
 *
 * @param models
 */
const generateSchema = (responses) => {
  // Init `schema` object
  const schema = {
    plugins: {},
  };

  const buildSchema = (model, name, plugin = false) => {
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
        const displayedAttribute = current.plugin ?
          get(responses.plugins, [current.plugin, 'models', current.model || current.collection, 'info', 'mainField']) ||
          findKey(get(responses.plugins, [current.plugin, 'models', current.model || current.collection, 'attributes']), { type : 'string'}) ||
          'id' :
          get(responses.models, [current.model || current.collection, 'info', 'mainField']) ||
          findKey(get(responses.models, [current.model || current.collection, 'attributes']), { type : 'string'}) ||
          'id';

        acc[current.alias] = {
          ...current,
          description: '',
          displayedAttribute,
        };

        return acc;
      }, {});
    }

    if (plugin) {
      return set(schema.plugins, `${plugin}.${name}`, schemaModel);
    }

    // Set the formatted model to the schema
    schema[name] = schemaModel;
  };

  // Generate schema for plugins.
  forEach(responses.plugins, (plugin, pluginName) => {
    forEach(plugin.models, (model, name) => {
      buildSchema(model, name, pluginName);
    });
  });

  // Generate schema for models.
  forEach(responses.models, (model, name) => {
    buildSchema(model, name);
  });

  return schema;
};

export {
  generateSchema,
};
