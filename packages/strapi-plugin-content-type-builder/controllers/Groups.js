'use strict';
const validateGroupInput = require('./validation/group');
const _ = require('lodash');
/**
 * Groups controller
 */

module.exports = {
  /**
   * GET /groups handler
   * Returns a list of available groups
   * @param {Object} ctx - koa context
   */
  async getGroups(ctx) {
    const service = strapi.plugins['content-type-builder'].services.groups;
    const data = service.getGroups();

    ctx.send({ data });
  },

  /**
   * GET /groups/:uid
   * Returns a specific group
   * @param {Object} ctx - koa context
   */
  async getGroup(ctx) {
    const { uid } = ctx.params;

    const service = strapi.plugins['content-type-builder'].services.groups;
    const group = service.getGroup(uid);

    if (!group) {
      return ctx.send({ error: 'group.notFound' }, 404);
    }

    ctx.send({ data: group });
  },

  /**
   * POST /groups
   * Creates a group and returns its infos
   * @param {Object} ctx - koa context
   */
  async createGroup(ctx) {
    const { body } = ctx.request;

    try {
      await validateGroupInput(body);
    } catch (error) {
      return ctx.send({ error }, 400);
    }

    const service = strapi.plugins['content-type-builder'].services.groups;
    const uid = service.createGroupUID(body.name);

    if (service.getGroup(uid)) {
      return ctx.send({ error: 'group.alreadyExists' }, 400);
    }

    strapi.reload.isWatching = false;

    const newGroup = await service.createGroup(uid, body);

    strapi.reload();

    ctx.send({ data: newGroup }, 201);
  },

  /**
   * PUT /groups/:uid
   * Updates a group and return its infos
   * @param {Object} ctx - koa context - enhanced koa context
   */
  async updateGroup(ctx) {
    const { uid } = ctx.params;
    const { body } = ctx.request;

    const service = strapi.plugins['content-type-builder'].services.groups;
    const group = service.getGroup(uid);

    if (!group) {
      return ctx.send({ error: 'group.notFound' }, 404);
    }

    // convert zero length string on default attributes to undefined
    if (_.has(body, 'attributes')) {
      Object.keys(body.attributes).forEach(attribute => {
        if (body.attributes[attribute].default === '') {
          body.attributes[attribute].default = undefined;
        }
      });
    }

    try {
      await validateGroupInput(body);
    } catch (error) {
      return ctx.send({ error }, 400);
    }

    strapi.reload.isWatching = false;

    const updatedGroup = await service.updateGroup(group, body);
    await service.updateGroupInModels(group.uid, updatedGroup.uid);

    strapi.reload();

    ctx.send({ data: updatedGroup }, 200);
  },

  /**
   * DELETE /groups/:uid
   * Deletes a groups and returns its old infos
   * @param {Object} ctx - koa context
   */
  async deleteGroup(ctx) {
    const { uid } = ctx.params;

    const service = strapi.plugins['content-type-builder'].services.groups;
    const group = service.getGroup(uid);

    if (!group) {
      return ctx.send({ error: 'group.notFound' }, 404);
    }

    strapi.reload.isWatching = false;

    await service.deleteGroup(group);
    await service.deleteGroupInModels(group.uid);

    strapi.reload();

    ctx.send({ data: { uid } }, 200);
  },
};
