module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/complexes',
      handler: 'complex.find',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/complexes/:id',
      handler: 'complex.findOne',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/complexes',
      handler: 'complex.create',
      config: {
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/complexes/:id',
      handler: 'complex.update',
      config: {
        policies: [],
      },
    },
    {
      method: 'DELETE',
      path: '/complexes/:id',
      handler: 'complex.delete',
      config: {
        policies: [],
      },
    },
  ],
};
