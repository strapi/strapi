const createRq = require('./request');

const auth = {
  username: 'admin',
  email: 'admin@strapi.io',
  password: 'pcw123',
};

const rq = createRq();

module.exports = {
  auth,
  login: async () => {
    const { body } = await rq({
      url: '/auth/local',
      method: 'POST',
      body: {
        identifier: auth.email,
        password: auth.password,
      },
    });

    return body;
  },
};
