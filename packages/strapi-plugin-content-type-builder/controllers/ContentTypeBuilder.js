'use strict';

const fs = require('fs');
const _ = require('lodash');

const Service = require('../services/ContentTypeBuilder');
const { escapeNewlines } = require('../utils/helpers.js');

module.exports = {
  getModels: async ctx => {
    ctx.send({ models: Service.getModels() });
  },

  getModel: async ctx => {
    const Service = strapi.plugins['content-type-builder'].services.contenttypebuilder;
    const { source } = ctx.request.query;

    let { model } = ctx.params;

    model = _.toLower(model);

    if (!source && !_.get(strapi.models, model)) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.unknown' }] }]);

    if (source && !_.get(strapi.plugins, [source, 'models', model])) {
      return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.unknown' }] }]);
    }

    const modelLayout = await Service.getModel(model, source);

    ctx.send({ model: modelLayout });
  },

  getConnections: async ctx => {
    ctx.send({ connections: Service.getConnections() });
  },

  createModel: async ctx => {
    const { name, description, connection, collectionName, attributes = [], plugin } = ctx.request.body;

    if (!name) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.name.missing' }] }]);
    if (!_.includes(Service.getConnections(), connection)) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.connection.unknow' }] }]);
    if (strapi.models[name]) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.exist' }] }]);
    if (!_.isNaN(parseFloat(name[0]))) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.name' }] }]);

    const [formatedAttributes, attributesErrors] = Service.formatAttributes(attributes, name, plugin);

    if (!_.isEmpty(attributesErrors)) {
      return ctx.badRequest(null, [{ messages: attributesErrors }]);
    }

    const _description = escapeNewlines(description, '\\n');

    strapi.reload.isWatching = false;

    await Service.appearance(formatedAttributes, name);

    await Service.generateAPI(name, _description, connection, collectionName, []);

    const modelFilePath = await Service.getModelPath(name, plugin);

    try {
      const modelJSON = _.cloneDeep(require(modelFilePath));

      modelJSON.attributes = formatedAttributes;

      const clearRelationsErrors = Service.clearRelations(name, plugin);

      if (!_.isEmpty(clearRelationsErrors)) {
        return ctx.badRequest(null, [{ messages: clearRelationsErrors }]);
      }

      const createRelationsErrors = Service.createRelations(name, attributes, plugin);

      if (!_.isEmpty(createRelationsErrors)) {
        return ctx.badRequest(null, [{ messages: createRelationsErrors }]);
      }

      try {
        fs.writeFileSync(modelFilePath, JSON.stringify(modelJSON, null, 2), 'utf8');

        if (_.isEmpty(strapi.api)) {
          strapi.emit('didCreateFirstContentType');
        } else {
          strapi.emit('didCreateContentType');
        }

        ctx.send({ ok: true });

        strapi.reload();
      } catch (e) {
        strapi.emit('didNotCreateContentType', e);
        return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.write' }] }]);
      }
    } catch (e) {
      return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.read' }] }]);
    }
  },

  updateModel: async ctx => {
    const { model } = ctx.params;
    const { name, description, mainField, connection, collectionName, attributes = [], plugin } = ctx.request.body;

    if (!name) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.name.missing' }] }]);
    if (!_.includes(Service.getConnections(), connection)) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.connection.unknow' }] }]);
    if (strapi.models[_.toLower(name)] && name !== model) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.exist' }] }]);
    if (!strapi.models[_.toLower(model)] && plugin && !strapi.plugins[_.toLower(plugin)].models[_.toLower(model)]) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.unknown' }] }]);
    if (!_.isNaN(parseFloat(name[0]))) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.name' }] }]);
    if (plugin && !strapi.plugins[_.toLower(plugin)]) return ctx.badRequest(null, [{ message: [{ id: 'request.error.plugin.name' }] }]);

    const [formatedAttributes, attributesErrors] = Service.formatAttributes(attributes, name.toLowerCase(), plugin);

    if (!_.isEmpty(attributesErrors)) {
      return ctx.badRequest(null, [{ messages: attributesErrors }]);
    }

    const _description = escapeNewlines(description);

    let modelFilePath = Service.getModelPath(model, plugin);

    strapi.reload.isWatching = false;

    if (name !== model) {
      await Service.generateAPI(name, _description, connection, collectionName, []);
    }

    await Service.appearance(formatedAttributes, name, plugin);

    try {
      const modelJSON = _.cloneDeep(require(modelFilePath));

      modelJSON.connection = connection;
      modelJSON.collectionName = collectionName;
      modelJSON.info = {
        name,
        description: _description
      };
      modelJSON.attributes = formatedAttributes;

      if (mainField) {
        modelJSON.info.mainField = mainField;
      }

      const clearRelationsErrors = Service.clearRelations(model, plugin);

      if (!_.isEmpty(clearRelationsErrors)) {
        return ctx.badRequest(null, [{ messages: clearRelationsErrors }]);
      }

      const createRelationsErrors = Service.createRelations(name, attributes, plugin);

      if (!_.isEmpty(createRelationsErrors)) {
        return ctx.badRequest(null, [{ messages: createRelationsErrors }]);
      }

      if (name !== model) {
        const removeModelErrors = Service.removeModel(model);

        if (!_.isEmpty(removeModelErrors)) {
          return ctx.badRequest(null, [{ messages: removeModelErrors }]);
        }

        modelFilePath = Service.getModelPath(name, plugin);
      }

      try {
        fs.writeFileSync(modelFilePath, JSON.stringify(modelJSON, null, 2), 'utf8');

        ctx.send({ ok: true });

        strapi.reload();
      } catch (e) {
        return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.write' }] }]);
      }
    } catch (e) {
      return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.read' }] }]);
    }
  },

  deleteModel: async ctx => {
    const { model } = ctx.params;

    if (!_.get(strapi.models, model)) return ctx.badRequest(null, [{ messages: [{ id: 'request.error.model.unknown' }] }]);

    strapi.reload.isWatching = false;

    const clearRelationsErrors = Service.clearRelations(model, undefined, true);

    if (!_.isEmpty(clearRelationsErrors)) {
      return ctx.badRequest(null, [{ messages: clearRelationsErrors }]);
    }

    const removeModelErrors = Service.removeModel(model);

    if (!_.isEmpty(removeModelErrors)) {
      return ctx.badRequest(null, [{ messages: removeModelErrors }]);
    }

    const pluginStore = strapi.store({
      environment: '',
      type: 'plugin',
      name: 'content-manager'
    });

    const schema = await pluginStore.get({ key: 'schema' });

    delete schema.layout[model];

    await pluginStore.set({ key: 'schema', value: schema });

    ctx.send({ ok: true });

    strapi.reload();
  },

  autoReload: async ctx => {
    ctx.send({
      autoReload: _.get(strapi.config.currentEnvironment, 'server.autoReload', { enabled: false })
    });
  },

  checkTableExists: async ctx => {
    // Get connection
    const { connection } = ctx.params;

    const connector = _.get(strapi.config.currentEnvironment.database.connections, [connection, 'connector']);
    const model = _.toLower(ctx.params.model);

    if (!model) {
      return ctx.badRequest(null, [{ messages: [{ id: 'Model is required' }] }]);
    }

    if (!connector) {
      return ctx.badRequest(null, [{ messages: [{ id: 'Connection doesn\'t exist' }] }]);
    }

    if (connector === 'strapi-hook-bookshelf') {
      try {
        const tableExists = await strapi.connections[connection].schema.hasTable(model);

        return ctx.send({ tableExists });
      } catch(error) {
        return ctx.badRequest(null, [{ messages: [{ id: 'Not found' }] }]);
      }
    }

    ctx.send({ tableExists: true });
  }
};
