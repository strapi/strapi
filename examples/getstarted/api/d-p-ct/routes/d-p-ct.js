module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/d-p-cts',
      handler: 'd-p-ct.find',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/d-p-cts/:id',
      handler: 'd-p-ct.findOne',
      config: {
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/d-p-cts',
      handler: 'd-p-ct.create',
      config: {
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/d-p-cts/:id',
      handler: 'd-p-ct.update',
      config: {
        policies: [],
      },
    },
    {
      method: 'DELETE',
      path: '/d-p-cts/:id',
      handler: 'd-p-ct.delete',
      config: {
        policies: [],
      },
    },
  ],
};
