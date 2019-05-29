const { createRequest } = require('./request');

const auth = {
  username: 'admin',
  email: 'admin@strapi.io',
  password: 'pcw123',
};

const rq = createRequest();

const register = async () => {
  await rq({
    url: '/admin/auth/local/register',
    method: 'POST',
    body: auth,
  }).catch(err => {
    if (err.error.message.includes("You can't register a new admin")) return;
    throw err;
  });
};

const login = async () => {
  const { body } = await rq({
    url: '/admin/auth/local',
    method: 'POST',
    body: {
      identifier: auth.email,
      password: auth.password,
    },
  });

  return body;
};

module.exports = {
  async registerAndLogin() {
    // register
    await register();

    // login
    const { jwt } = await login();
    return jwt;
  },
};
