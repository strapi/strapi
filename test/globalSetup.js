const { auth } = require('./helpers/auth');
const createReq = require('./helpers/request');

const rq = createReq();

module.exports = async () => {
  await rq({
    url: '/auth/local/register',
    method: 'POST',
    body: auth,
  }).catch(err => {
    console.log(err);
    throw err;
  });
};
