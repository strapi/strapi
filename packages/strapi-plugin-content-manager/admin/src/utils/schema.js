import _ from 'lodash';
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

  _.forEach(models, (model, name) => {
    // Model data
    const schemaModel = {
      label: _.upperFirst(name),
      labelPlural: _.upperFirst(pluralize(name)),
      orm: model.orm || 'mongoose',
    };

    // Fields (non relation)
    schemaModel.fields = _.mapValues(_.pickBy(model.attributes, attribute =>
      !attribute.model && !attribute.collection
    ), (value, attribute) => ({
      label: _.upperFirst(attribute),
      description: '',
      type: value.type || 'string',
    }));

    // Select fields displayed in list view
    schemaModel.list = _.slice(_.keys(schemaModel.fields), 0, 4);

    // Model relations
    schemaModel.relations = _.mapValues(_.pickBy(model.attributes, attribute =>
      attribute.model
    ), (value, attribute) => ({
      columnName: attribute,
      model: value.model,
      attribute,
      label: _.upperFirst(attribute),
      descripion: '',
      displayedAttribute: _.findKey(models[value.model].attributes, { type: 'string' }) || 'id',
    })
    );

    // Set the formatted model to the schema
    schema[name] = schemaModel;
  });

  return schema;
};

export {
  generateSchema,
};