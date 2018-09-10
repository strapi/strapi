const rq = require('./request');

const auth = {
  username: 'admin',
  email: 'admin@strapi.io',
  password: 'pcw123'
};

module.exports = {
  auth,
  login: () => {
    return new Promise(async (resolve) => {
      const body = await rq({
        url: `/auth/local`,
        method: 'POST',
        body: {
          identifier: auth.email,
          password: auth.password
        },
        json: true
      });

      resolve(body);
    });
  }
};
