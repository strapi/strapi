export const routes = {
  type: 'content-api',
  routes: [
    {
      method: 'POST',
      path: '/',
      handler: 'content-api.upload',
    },
    {
      method: 'GET',
      path: '/files',
      handler: 'content-api.find',
    },
    {
      method: 'GET',
      path: '/files/:id',
      handler: 'content-api.findOne',
    },
    {
      method: 'DELETE',
      path: '/files/:id',
      handler: 'content-api.destroy',
    },
  ],
};
