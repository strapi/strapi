module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/temps',
      handler: 'temp.find',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/temps/:id',
      handler: 'temp.findOne',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/temps',
      handler: 'temp.create',
      config: {
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/temps/:id',
      handler: 'temp.update',
      config: {
        policies: [],
      },
    },
    {
      method: 'DELETE',
      path: '/temps/:id',
      handler: 'temp.delete',
      config: {
        policies: [],
      },
    },
  ],
};
