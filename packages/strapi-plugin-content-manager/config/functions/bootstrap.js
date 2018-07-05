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

  const getApis = (data) => Object.keys(data).reduce((acc, curr) => {
    if (data[curr].fields) {
      return acc.concat([curr]);
    }

    if (curr === 'plugins') {
      Object.keys(data[curr]).map(plugin => {
        Object.keys(data[curr][plugin]).map(api => {
          acc = acc.concat([`${curr}.${plugin}.${api}`]);
        });
      });
    }

    return acc;
  }, []);

  const getApisKeys = (data, sameArray) => sameArray.map(apiPath => {
    const fields = Object.keys(_.get(data.models, apiPath.concat(['fields'])));

    return fields.map(field => `${apiPath.join('.')}.fields.${field}`);
  });
  
  try {
    const prevSchema = await pluginStore.get({ key: 'schema' });

    if (!prevSchema) {
      pluginStore.set({ key: 'schema', value: schema });
      return cb(); 
    }

    const splitted = str => str.split('.');
    const prevSchemaApis = getApis(prevSchema.models);
    const schemaApis = getApis(schema.models);
    const apisToAdd = schemaApis.filter(api => prevSchemaApis.indexOf(api) === -1).map(splitted);
    const apisToRemove = prevSchemaApis.filter(api => schemaApis.indexOf(api) === -1).map(splitted);
    const sameApis = schemaApis.filter(api => prevSchemaApis.indexOf(api) !== -1).map(splitted);
    const schemaSameApisKeys = _.flattenDeep(getApisKeys(schema, sameApis));
    const prevSchemaSameApisKeys = _.flattenDeep(getApisKeys(prevSchema, sameApis));
    const sameApisAttrToAdd = schemaSameApisKeys.filter(attr => prevSchemaSameApisKeys.indexOf(attr) === -1).map(splitted);
    const sameApisAttrToRemove = prevSchemaSameApisKeys.filter(attr => schemaSameApisKeys.indexOf(attr) === -1).map(splitted);

    // Remove api
    apisToRemove.map(apiPath => {
      _.unset(prevSchema.models, apiPath);
    });
    
    // Remove API attribute
    sameApisAttrToRemove.map(attrPath => {
      // Check default sort and change it if needed
      _.unset(prevSchema.models, attrPath);
      const apiPath = attrPath.length > 3 ? _.take(attrPath, 3) : _.take(attrPath, 1);
      const listDisplayPath = apiPath.concat('listDisplay');
      const prevListDisplay = _.get(prevSchema.models, listDisplayPath);
      const defaultSortPath = apiPath.concat('defaultSort');
      const currentAttr = attrPath.slice(-1);

      const defaultSort = _.get(prevSchema.models, defaultSortPath);

      if (_.includes(currentAttr, defaultSort)) {
        _.set(prevSchema.models, defaultSortPath, _.get(schema.models, defaultSortPath));
      }

      // Update the displayed fields
      const updatedListDisplay = prevListDisplay.filter(obj => obj.name !== currentAttr.join());

      if (updatedListDisplay.length === 0) {
        // Update it with the one from the generaeted schema
        _.set(prevSchema.models, listDisplayPath, _.get(schema.models, listDisplayPath, []));
      } else {
        _.set(prevSchema.models, listDisplayPath, updatedListDisplay);
      }
    });

    // Add API
    apisToAdd.map(apiPath => {
      const api = _.get(schema.models, apiPath);
      _.set(prevSchema.models, apiPath, api);
    });
  
    // Add attribute to existing API
    sameApisAttrToAdd.map(attrPath => {
      const attr = _.get(schema.models, attrPath);
      _.set(prevSchema.models, attrPath, attr);
    });


    // Update other keys
    sameApis.map(apiPath => {
      const keysToUpdate = ['relations', 'loadedModel', 'associations', 'attributes'].map(key => apiPath.concat(key));

      keysToUpdate.map(keyPath => {
        const newValue = _.get(schema.models, keyPath);
        
        _.set(prevSchema.models, keyPath, newValue);
      });
    });

    pluginStore.set({ key: 'schema', value: prevSchema });
  
  } catch(err) {
    console.log('error', err);
  }  

  cb();
};