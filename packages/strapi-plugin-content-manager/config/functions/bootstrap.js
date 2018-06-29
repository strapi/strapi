const _ = require('lodash');
const pluralize = require('pluralize');

module.exports = async cb => {
  const pickData = (model) => _.pick(model, [
    'info',
    'connection',
    'collectionName',
    'attributes',
    'identity',
    'globalId',
    'globalName',
    'orm',
    'loadedModel',
    'primaryKey',
    'associations'
  ]);
  
  const models = _.mapValues(strapi.models, pickData);
  delete models['core_store'];
  const pluginsModel = Object.keys(strapi.plugins).reduce((acc, current) => {
    acc[current] = {
      models: _.mapValues(strapi.plugins[current].models, pickData),
    };
  
    return acc;
  }, {});
  
  // Init schema
  const schema = {
    generalSettings: {
      search: true,
      filters: true,
      bulkActions: true,
      pageEntries: 10,
    },
    models: {
      plugins: {},
    },
  };
  
  const buildSchema = (model, name, plugin = false) => {
    // Model data
    const schemaModel = Object.assign({
      label: _.upperFirst(name),
      labelPlural: _.upperFirst(pluralize(name)),
      orm: model.orm || 'mongoose',
      search: true,
      filters: true,
      bulkActions: true,
      pageEntries: 10,
      defaultSort: model.primaryKey,
      sort: 'ASC',
    }, model);
  
    // Fields (non relation)
    schemaModel.fields = _.mapValues(_.pickBy(model.attributes, attribute =>
      !attribute.model && !attribute.collection
    ), (value, attribute) => ({
      label: _.upperFirst(attribute),
      description: '',
      type: value.type || 'string',
    }));
  
    // Select fields displayed in list view
    // schemaModel.list = _.slice(_.keys(schemaModel.fields), 0, 4);
    schemaModel.listDisplay = Object.keys(schemaModel.fields)
      // Construct Array of attr ex { type: 'string', label: 'Foo', name: 'Foo', description: '' }
      // NOTE: Do we allow sort on boolean?
      .map(attr => {
        const attrType = schemaModel.fields[attr].type;
        const sortable = attrType !== 'json' && attrType !== 'array';

        return Object.assign(schemaModel.fields[attr], { name: attr, sortable, searchable: sortable });
      })
      // Retrieve only the fourth first items
      .slice(0, 4);
      
    schemaModel.listDisplay.splice(0, 0, {
      name: model.primaryKey || 'id',
      label: 'Id',
      type: 'string',
      sortable: true,
      searchable: true,
    });
    
    if (model.associations) {
      // Model relations
      schemaModel.relations = model.associations.reduce((acc, current) => {
        const displayedAttribute = current.plugin ?
          _.get(pluginsModel, [current.plugin, 'models', current.model || current.collection, 'info', 'mainField']) ||
          _.findKey(_.get(pluginsModel, [current.plugin, 'models', current.model || current.collection, 'attributes']), { type : 'string'}) ||
          'id' :
          _.get(models, [current.model || current.collection, 'info', 'mainField']) ||
          _.findKey(_.get(models, [current.model || current.collection, 'attributes']), { type : 'string'}) ||
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
      return _.set(schema.models.plugins, `${plugin}.${name}`, schemaModel);
    }
  
    // Set the formatted model to the schema
    schema.models[name] = schemaModel;
  };
  
  _.forEach(pluginsModel, (plugin, pluginName) => {
    _.forEach(plugin.models, (model, name) => {
      buildSchema(model, name, pluginName);
    });
  });
  
  // Generate schema for models.
  _.forEach(models, (model, name) => {
    buildSchema(model, name);
  });
  
  const pluginStore = strapi.store({
    environment: '',
    type: 'plugin',
    name: 'content-manager'
  });
  
  const buildSchemaKeys = (data) => Object.keys(data).reduce((acc, curr) => {
    if (curr !== 'plugins') {

      if (!data[curr].fields && _.isObject(data[curr])) {
        return buildSchemaKeys(data[curr]);
      }

      return acc.concat([{ [curr]: Object.keys(data[curr].fields) }]);
    } 
  
    return buildSchemaKeys(data[curr]);
  }, []);
  
  try {
    const prevSchema = await pluginStore.get({ key: 'schema' });
  
    if (!prevSchema) {
      pluginStore.set({ key: 'schema', value: schema });
      return cb(); 
    }
  
    const prevSchemaKeys = buildSchemaKeys(prevSchema.models);
    const schemaKeys = buildSchemaKeys(schema.models);
  
    // Update the store with the new created APIs
    if (!_.isEqual(prevSchemaKeys, schemaKeys)) {
      pluginStore.set({ key: 'schema', value: _.merge(schema, prevSchema) });
    }
  
  
  } catch(err) {
    console.log('error', err);
  }  
  

  cb();
};