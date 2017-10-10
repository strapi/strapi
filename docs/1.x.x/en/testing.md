# Testing

Strapi's test suite is written using [mocha](https://mochajs.org/) and although
Strapi doesn't impose any testing framework for your apps, in this example we
will setup tests using the mocha framework.

## Setup

Before writing tests, you should setup a basic directory structure, like this:
```
./strapiApp
├── api/
├── ...
├── test/
│  ├── integration/
│  │  ├── controllers/
│  │  │  └── my_endpoint.test.js
│  │  ├── models/
│  │  │  └── my_model.test.js
│  │  └── ...
|  ├── ...
│  ├── bootstrap.js
```

## Boostrap

We are going to setup a `bootstrap.js` with `before` and `after` hooks to
perform any actions before and after our tests.  
In this example, the app server is started before running any tests an stop
the server after tests are completed.

*./test/bootstrap.js*

```js
const strapi = require('strapi');

before(function (done) {
  strapi.start({}, function(err) {
    if (err) {
      return done(err);
    }

    done(err, strapi);
  });
});

after(function (done) {
  strapi.stop(done());
});
```

## Writing tests

Once you have setup your directory structure, you can start writing your tests.
In this example we use [co-supertest](https://github.com/avbel/co-supertest),
a `co` and `Supertest` integration library.
[Supertest](https://github.com/visionmedia/supertest) provides several useful
methods for testing HTTP requests.  
If you want to test an api endpoint, you can do it like this:  

*./test/integration/controllers/my_endpoint.js*

```js
const request = require('co-supertest');

describe('MyEndpoint Controller Integration', function() {
  describe('GET /my_endpoint', function() {
    it('should return 200 status code', function *() {
      yield request(strapi.config.url)
        .get('/my_endpoint')
        .expect(200)
        .expect('Content-Type', /json/)
        .end();
    });
  });
});
```

## Running tests

In order to run tests you can use `npm test`. In your `package.json`, in the
`scripts` section, add this:

*./package.json*

```js
"scripts": {
  "test": "mocha --require co-mocha test/bootstrap.js test/**/*.test.js"
}
```

Remember to run `test/bootstrap.js` before any other tests and, if you want,
use the `--require` option to pass any required dependencies you need available
in your tests.
