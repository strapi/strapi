'use strict';

const { getService } = require('../utils');

const controller = {
  async createTask(ctx) {
    return getService('tasks').createTask(ctx.request.body);
  },

  async updateTask(ctx) {
    const data = ctx.request.body;
    const { documentId } = ctx.params;
    return getService('tasks').updateTask({ documentId, data });
  },

  async deleteTask(ctx) {
    const { documentId } = ctx.params;

    return getService('tasks').deleteTask(documentId);
  },

  async listRelatedTasks(ctx) {
    const { slug } = ctx.params;
    const { documentId } = ctx.query;
    return getService('tasks').listRelatedTasks({ slug, documentId });
  },
};

module.exports = controller;
