'use strict';

module.exports = ({ strapi }) => ({
  async createTask(data) {
    return strapi.documents('plugin::todo.task').create({ data });
  },

  async updateTask({ documentId, data }) {
    return strapi.documents('plugin::todo.task').update({
      documentId,
      data,
    });
  },

  async deleteTask(documentId) {
    return strapi.documents('plugin::todo.task').delete({
      documentId,
    });
  },

  async listRelatedTasks({ documentId, slug }) {
    return strapi.db.query('plugin::todo.task').findMany({
      where: {
        // Only pass the related ID if it's pointing to a collection type
        ...(documentId !== '' && {
          target_id: documentId,
        }),
        target_type: slug,
      },
    });
  },
});
