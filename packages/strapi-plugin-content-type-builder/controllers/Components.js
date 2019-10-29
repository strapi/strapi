'use strict';
const {
  validateComponentInput,
  validateUpdateComponentInput,
} = require('./validation/component');

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
    const service = strapi.plugins['content-type-builder'].services.components;
    const data = service.getComponents();

    ctx.send({ data });
  },

  /**
   * GET /components/:uid
   * Returns a specific component
   * @param {Object} ctx - koa context
   */
  async getComponent(ctx) {
    const { uid } = ctx.params;

    const service = strapi.plugins['content-type-builder'].services.components;
    const component = service.getComponent(uid);

    if (!component) {
      return ctx.send({ error: 'component.notFound' }, 404);
    }

    ctx.send({ data: component });
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

    const service = strapi.plugins['content-type-builder'].services.components;
    const uid = service.createComponentUID(body);

    if (service.getComponent(uid)) {
      return ctx.send({ error: 'component.alreadyExists' }, 400);
    }

    strapi.reload.isWatching = false;

    const newComponent = await service.createComponent({ uid, infos: body });

    strapi.reload();

    ctx.send({ data: newComponent }, 201);
  },

  /**
   * PUT /components/:uid
   * Updates a component and return its infos
   * @param {Object} ctx - koa context - enhanced koa context
   */
  async updateComponent(ctx) {
    const { uid } = ctx.params;
    const { body } = ctx.request;

    const service = strapi.plugins['content-type-builder'].services.components;
    const component = service.getComponent(uid);

    if (!component) {
      return ctx.send({ error: 'component.notFound' }, 404);
    }

    try {
      await validateUpdateComponentInput(body);
    } catch (error) {
      return ctx.send({ error }, 400);
    }

    const newUID = service.createComponentUID(body);
    if (newUID !== uid && service.getComponent(newUID)) {
      return ctx.send({ error: 'new.component.alreadyExists' }, 400);
    }

    strapi.reload.isWatching = false;

    const updatedComponent = await service.updateComponent({
      newUID,
      component,
      infos: body,
    });
    await service.updateComponentInModels(component.uid, updatedComponent.uid);

    strapi.reload();

    ctx.send({ data: updatedComponent }, 200);
  },

  /**
   * DELETE /components/:uid
   * Deletes a components and returns its old infos
   * @param {Object} ctx - koa context
   */
  async deleteComponent(ctx) {
    const { uid } = ctx.params;

    const service = strapi.plugins['content-type-builder'].services.components;
    const component = service.getComponent(uid);

    if (!component) {
      return ctx.send({ error: 'component.notFound' }, 404);
    }

    strapi.reload.isWatching = false;

    await service.deleteComponent(component);
    await service.deleteComponentInModels(component.uid);

    strapi.reload();

    ctx.send({ data: { uid } }, 200);
  },
};
