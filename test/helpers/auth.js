const { createRequest } = require('./request');

const auth = {
  email: 'admin@strapi.io',
  firstname: 'admin',
  lastname: 'admin',
  password: 'Password123',
};

const rq = createRequest();

const register = async () => {
  await rq({
    url: '/admin/register-admin',
    method: 'POST',
    body: auth,
  }).catch(err => {
    console.error(err);
    if (err.message === 'You cannot register a new super admin') return;
    throw err;
  });
};

const login = async () => {
  const { body } = await rq({
    url: '/admin/login',
    method: 'POST',
    body: {
      email: auth.email,
      password: auth.password,
    },
  });

  return body.data;
};

module.exports = {
  async registerAndLogin() {
    // register
    await register();

    // login
    const user = await login();

    return user && user.token;
  },
  async login() {
    const user = await login();

    return user && user.token;
  },
};
