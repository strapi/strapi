const createRq = require('./request');

const auth = {
  username: 'admin',
  email: 'admin@strapi.io',
  password: 'pcw123',
};

const rq = createRq();

module.exports = {
  auth,
  login: () => {
    return new Promise(async resolve => {
      const res = await rq({
        url: '/auth/local',
        method: 'POST',
        body: {
          identifier: auth.email,
          password: auth.password,
        },
      });

      resolve(res.body);
    });
  },
};
