module.exports = [
  {
    method: 'POST',
    path: '/callback',
    handler: 'auth.callback',
    config: {
      auth: false,
      policies: [],
    },
  },
];
