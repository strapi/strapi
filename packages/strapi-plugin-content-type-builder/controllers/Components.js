'use strict';

const path = require('path');
const _ = require('lodash');

const {
  validateComponentInput,
  validateUpdateComponentInput,
} = require('./validation/component');
const componentService = require('../services/Components');
const createSchemaManager = require('../services/schema-manager');

/**
 * Components controller
 */

module.exports = {
  /**
   * GET /components handler
   * Returns a list of available components
   * @param {Object} ctx - koa context
   */
  async getComponents(ctx) {
    const data = Object.keys(strapi.components).map(uid => {
      return componentService.formatComponent(strapi.components[uid]);
    });

    ctx.send({ data });
  },

  /**
   * GET /components/:uid
   * Returns a specific component
   * @param {Object} ctx - koa context
   */
  async getComponent(ctx) {
    const { uid } = ctx.params;

    const component = strapi.components[uid];

    if (!component) {
      return ctx.send({ error: 'component.notFound' }, 404);
    }

    ctx.send({ data: componentService.formatComponent(component) });
  },

  /**
   * POST /components
   * Creates a component and returns its infos
   * @param {Object} ctx - koa context
   */
  async createComponent(ctx) {
    const { body } = ctx.request;

    try {
      await validateComponentInput(body);
    } catch (error) {
      return ctx.send({ error }, 400);
    }

    const uid = componentService.createComponentUID(body.component);

    if (_.has(strapi.components, uid)) {
      return ctx.send({ error: 'component.alreadyExists' }, 400);
    }

    const manager = createSchemaManager({
      components: Object.keys(strapi.components).map(key => {
        const compo = strapi.components[key];

        return {
          uid: compo.uid,
          filename: compo.__filename__,
          dir: path.join(strapi.dir, 'components'),
          schema: compo.__schema__,
        };
      }),
      contentTypes: Object.keys(strapi.contentTypes).map(key => {
        const contentType = strapi.contentTypes[key];

        let dir;
        if (contentType.plugin) {
          dir = `./extensions/${contentType.plugin}/models`;
        } else {
          dir = `./api/${contentType.apiName}/models`;
        }

        return {
          uid: contentType.uid,
          filename: contentType.__filename__,
          dir: path.join(strapi.dir, dir),
          schema: contentType.__schema__,
        };
      }),
    });

    await manager.edit(ctx => {
      ctx.createComponent(uid, body.component);
    });

    // strapi.reload.isWatching = false;

    // const newComponent = await componentService.createComponent({
    //   uid,
    //   infos: body.component,
    // });

    // strapi.reload();

    ctx.send({ data: uid }, 201);
  },

  /**
   * PUT /components/:uid
   * Updates a component and return its infos
   * @param {Object} ctx - koa context - enhanced koa context
   */
  async updateComponent(ctx) {
    const { uid } = ctx.params;
    const { body } = ctx.request;

    const component = strapi.components[uid];

    if (!component) {
      return ctx.send({ error: 'component.notFound' }, 404);
    }

    try {
      await validateUpdateComponentInput(body);
    } catch (error) {
      return ctx.send({ error }, 400);
    }

    const newUID = componentService.updateComponentUID(
      component,
      body.component
    );
    if (newUID !== uid && _.has(strapi.components, newUID)) {
      return ctx.send({ error: 'new.component.alreadyExists' }, 400);
    }

    strapi.reload.isWatching = false;

    const updatedComponent = await componentService.updateComponent({
      component,
      infos: body.component,
    });

    await componentService.updateComponentInModels(
      component.uid,
      updatedComponent.uid
    );

    setImmediate(() => strapi.reload());

    ctx.send({ data: updatedComponent });
  },

  /**
   * DELETE /components/:uid
   * Deletes a components and returns its old infos
   * @param {Object} ctx - koa context
   */
  async deleteComponent(ctx) {
    const { uid } = ctx.params;

    const component = strapi.components[uid];

    if (!component) {
      return ctx.send({ error: 'component.notFound' }, 404);
    }

    strapi.reload.isWatching = false;

    await componentService.deleteComponentInModels(component.uid);
    await componentService.deleteComponent(component);

    setImmediate(() => strapi.reload());

    ctx.send({ data: { uid } });
  },
};
