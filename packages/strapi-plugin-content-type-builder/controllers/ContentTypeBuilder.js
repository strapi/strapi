'use strict';

const _ = require('lodash');

const Service = require('../services/ContentTypeBuilder');
const { escapeNewlines } = require('../utils/helpers.js');

module.exports = {
  /**
   * Returns the list of models and there details
   */
  async getModels(ctx) {
    const models = Service.getModels();
    const allModels = await Promise.all(
      models.map(({ name, source }) => Service.getModel(name, source))
    );

    ctx.send({ allModels, models });
  },

  async getModel(ctx) {
    const { source } = ctx.request.query;

    const Service =
      strapi.plugins['content-type-builder'].services.contenttypebuilder;

    let { model } = ctx.params;

    model = _.toLower(model);

    if (!source && !_.get(strapi.models, model))
      return ctx.badRequest(null, [
        { messages: [{ id: 'request.error.model.unknown' }] },
      ]);

    if (source && !_.get(strapi.plugins, [source, 'models', model])) {
      return ctx.badRequest(null, [
        { messages: [{ id: 'request.error.model.unknown' }] },
      ]);
    }

    const modelLayout = await Service.getModel(model, source);

    ctx.send({ model: modelLayout });
  },

  async getConnections(ctx) {
    ctx.send({
      connections: _.keys(
        strapi.config.currentEnvironment.database.connections
      ),
    });
  },

  async createModel(ctx) {
    const {
      name,
      description,
      connection,
      collectionName,
      attributes = [],
    } = ctx.request.body;

    if (!name)
      return ctx.badRequest(null, [
        { messages: [{ id: 'request.error.name.missing' }] },
      ]);
    if (!_.includes(Service.getConnections(), connection))
      return ctx.badRequest(null, [
        { messages: [{ id: 'request.error.connection.unknow' }] },
      ]);
    if (strapi.models[name])
      return ctx.badRequest(null, [
        { messages: [{ id: 'request.error.model.exist' }] },
      ]);
    if (!_.isNaN(parseFloat(name[0])))
      return ctx.badRequest(null, [
        { messages: [{ id: 'request.error.model.name' }] },
      ]);

    const [formatedAttributes, attributesErrors] = Service.formatAttributes(
      attributes,
      name
    );

    if (!_.isEmpty(attributesErrors)) {
      return ctx.badRequest(null, [{ messages: attributesErrors }]);
    }

    const _description = escapeNewlines(description, '\\n');

    strapi.reload.isWatching = false;

    const apiName = _.toLower(name);
    await Service.generateAPI(
      apiName,
      _description,
      connection,
      collectionName,
      []
    );

    try {
      const modelJSON = Service.readModel(name, { api: apiName });

      modelJSON.attributes = formatedAttributes;

      const createRelationsErrors = Service.createRelations(name, {
        attributes,
      });

      if (!_.isEmpty(createRelationsErrors)) {
        return ctx.badRequest(null, [{ messages: createRelationsErrors }]);
      }

      try {
        Service.writeModel(name, modelJSON, { api: apiName });

        if (_.isEmpty(strapi.api)) {
          strapi.emit('didCreateFirstContentType');
        } else {
          strapi.emit('didCreateContentType');
        }

        ctx.send({ ok: true });

        setImmediate(() => strapi.reload());
      } catch (e) {
        strapi.log.error(e);
        strapi.emit('didNotCreateContentType', e);
        return ctx.badRequest(null, [
          { messages: [{ id: 'request.error.model.write' }] },
        ]);
      }
    } catch (e) {
      strapi.log.error(e);
      return ctx.badRequest(null, [
        { messages: [{ id: 'request.error.model.read' }] },
      ]);
    }
  },

  async updateModel(ctx) {
    const { model } = ctx.params;
    const {
      name,
      description,
      mainField,
      connection,
      collectionName,
      attributes = [],
      plugin,
    } = ctx.request.body;

    if (!name)
      return ctx.badRequest(null, [
        { messages: [{ id: 'request.error.name.missing' }] },
      ]);
    if (!_.includes(Service.getConnections(), connection))
      return ctx.badRequest(null, [
        { messages: [{ id: 'request.error.connection.unknow' }] },
      ]);
    if (strapi.models[_.toLower(name)] && name !== model)
      return ctx.badRequest(null, [
        { messages: [{ id: 'request.error.model.exist' }] },
      ]);
    if (
      !strapi.models[_.toLower(model)] &&
      plugin &&
      !strapi.plugins[_.toLower(plugin)].models[_.toLower(model)]
    )
      return ctx.badRequest(null, [
        { messages: [{ id: 'request.error.model.unknown' }] },
      ]);
    if (!_.isNaN(parseFloat(name[0])))
      return ctx.badRequest(null, [
        { messages: [{ id: 'request.error.model.name' }] },
      ]);
    if (plugin && !strapi.plugins[_.toLower(plugin)])
      return ctx.badRequest(null, [
        { message: [{ id: 'request.error.plugin.name' }] },
      ]);

    const [formatedAttributes, attributesErrors] = Service.formatAttributes(
      attributes,
      name,
      plugin
    );

    if (!_.isEmpty(attributesErrors)) {
      return ctx.badRequest(null, [{ messages: attributesErrors }]);
    }

    const _description = escapeNewlines(description);

    strapi.reload.isWatching = false;

    if (name.toLowerCase() !== model.toLowerCase()) {
      await Service.generateAPI(
        name,
        _description,
        connection,
        collectionName,
        []
      );
    }

    try {
      const modelData = plugin
        ? strapi.plugins[plugin].models[model.toLowerCase()]
        : strapi.models[model.toLowerCase()];

      const modelJSON = _.cloneDeep(
        _.pick(modelData, [
          'connection',
          'collectionName',
          'info',
          'options',
          'attributes',
        ])
      );

      modelJSON.connection = connection;
      modelJSON.collectionName = collectionName;
      modelJSON.info = {
        name,
        description: _description,
      };
      modelJSON.attributes = formatedAttributes;

      if (mainField) {
        modelJSON.info.mainField = mainField;
      }

      const clearRelationsErrors = Service.clearRelations(model, plugin, {
        name,
      });

      if (!_.isEmpty(clearRelationsErrors)) {
        return ctx.badRequest(null, [{ messages: clearRelationsErrors }]);
      }

      const createRelationsErrors = Service.createRelations(name, {
        attributes,
        source: plugin,
        oldName: model,
      });

      if (!_.isEmpty(createRelationsErrors)) {
        return ctx.badRequest(null, [{ messages: createRelationsErrors }]);
      }

      if (name !== model) {
        const removeModelErrors = Service.removeModel(model);

        if (!_.isEmpty(removeModelErrors)) {
          return ctx.badRequest(null, [{ messages: removeModelErrors }]);
        }
      }

      try {
        if (plugin) {
          await Service.writeModel(name, modelJSON, { plugin });
        } else {
          await Service.writeModel(name, modelJSON, {
            api: name !== model ? name.toLowerCase() : modelData.apiName,
          });
        }

        ctx.send({ ok: true });

        strapi.reload();
      } catch (e) {
        strapi.log.error(e);
        return ctx.badRequest(null, [
          { messages: [{ id: 'request.error.model.write' }] },
        ]);
      }
    } catch (e) {
      strapi.log.error(e);
      return ctx.badRequest(null, [
        { messages: [{ id: 'request.error.model.read' }] },
      ]);
    }
  },

  async deleteModel(ctx) {
    const { model } = ctx.params;

    if (!_.get(strapi.models, model))
      return ctx.badRequest(null, [
        { messages: [{ id: 'request.error.model.unknown' }] },
      ]);

    strapi.reload.isWatching = false;

    const clearRelationsErrors = Service.clearRelations(model, undefined, {
      force: true,
    });

    if (!_.isEmpty(clearRelationsErrors)) {
      return ctx.badRequest(null, [{ messages: clearRelationsErrors }]);
    }

    const removeModelErrors = Service.removeModel(model);

    if (!_.isEmpty(removeModelErrors)) {
      return ctx.badRequest(null, [{ messages: removeModelErrors }]);
    }

    ctx.send({ ok: true });

    strapi.reload();
  },
};
