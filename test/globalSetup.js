const { auth } = require('./helpers/auth');
const rq = require('./helpers/request');
const restart = require('./helpers/restart');

// const sleep = time => new Promise(resolve => setTimeout(resolve, time));

module.exports = async () => {
  await rq({
    url: '/auth/local/register',
    method: 'POST',
    body: auth,
    json: true,
  }).catch(err => {
    console.log(err);
    throw err;
  });
};
