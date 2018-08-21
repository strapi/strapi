const {auth} = require('./helpers/auth');
const rq = require('./helpers/request');

describe('Initialize', () => {
  test(
    'Avoid failure',
    async () => {
      expect(true).toBeTruthy();
    }
  );

  test(
    'Register admin user',
    async () => {
      await rq({
        url: `/auth/local/register`,
        method: 'POST',
        body: auth,
        json: true
      });
    }
  );
});
