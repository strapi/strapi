'use strict';

module.exports = {
  type: 'admin',
  routes: [
    {
      method: 'POST',
      path: '/tasks',
      handler: 'tasks.createTask',
    },
    {
      method: 'PUT',
      path: '/tasks/:documentId',
      handler: 'tasks.updateTask',
    },
    {
      method: 'DELETE',
      path: '/tasks/:documentId',
      handler: 'tasks.deleteTask',
    },
    {
      method: 'GET',
      path: '/tasks/:slug',
      handler: 'tasks.listRelatedTasks',
    },
  ],
};
