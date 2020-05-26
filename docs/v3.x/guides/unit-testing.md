---
sidebarDepth: 2
---

# Unit testing

In this guide we will see how you can run basic unit tests for a Strapi application using a testing framework.

::: tip
In this example we will use [Jest](https://jestjs.io/) Testing Framework with a focus on simplicity and
[Supertest](https://github.com/visionmedia/supertest) Super-agent driven library for testing node.js HTTP servers using a fluent API
:::

## Install test tools

`Jest` contains a set of guidelines or rules used for creating and designing test cases - a combination of practices and tools that are designed to help testers test more efficiently.

`Supertest` allows you to test all the `api` routes as they were instances of [http.Server](https://nodejs.org/api/http.html#http_class_http_server)

:::: tabs

::: tab yarn
`yarn add jest supertest`
:::

::: tab npm
`npm install jest supertest`
:::

Once this is done add this to `package.json` file

add `test` command to `scripts` section

```json
  "scripts": {
    "develop": "strapi develop",
    "start": "strapi start",
    "build": "strapi build",
    "strapi": "strapi",
    "test": "jest --forceExit --detectOpenHandles"
  },
```

and add those line at the bottom of file

```json
  "jest": {
    "testPathIgnorePatterns": [
      "/node_modules/",
      ".tmp",
      ".cache"
    ],
    "testEnvironment": "node"
  }
```

Those will inform `Jest` not to look for test inside the folder where it shouldn't.
::::

## Introduction

### Testing environment

Test framework must have a clean empty environment to perform valid test and also not to interfere with current database.

Once `jest` is running it uses the `test` [enviroment](../concepts/configurations.md#environments) (switching `NODE_ENV` to `test`)
so we need to create a special environment setting for this purpose.
Copy contents of `./config/environments/development` into `./config/environments/test` and add some changes.
Edit `./config/environments/test/database.json` and add value `"filename": ".tmp/test.db"` - the reason of that is that we want to have a separate sqlite database for tests, so our test will not touch real data.
This file will be temporary, each time test is finished, we will remove that file that every time tests are run on the clean database.
The whole file will look like this:

**Path —** `./config/environments/test/database.json`

```json
{
  "defaultConnection": "default",
  "connections": {
    "default": {
      "connector": "bookshelf",
      "settings": {
        "client": "sqlite",
        "filename": ".tmp/test.db"
      },
      "options": {
        "useNullAsDefault": true,
        "pool": {
          "min": 0,
          "max": 15
        }
      }
    }
  }
}
```

### Strapi instance

In order to test anything we need to have a strapi instance that runs in the testing eviroment,
bascially we want to get instance of strapi app as object, similar like creating an instance for [process manager](process-manager).

These tasks require adding some files - let's create a folder `tests` where all the tests will be put and inside it, next to folder `helpers` where main Strapi helper will be in file strapi.js.

**Path —** `./tests/helpers/strapi.js`

```js
const Strapi = require('strapi');
const http = require('http');

let instance;

async function setupStrapi() {
  if (!instance) {
    /** the follwing code in copied from `./node_modules/strapi/lib/Strapi.js` */
    await Strapi().load();
    instance = strapi; // strapi is global now
    await instance.app
      .use(instance.router.routes()) // populate KOA routes
      .use(instance.router.allowedMethods()); // populate KOA methods

    instance.server = http.createServer(instance.app.callback());
  }
  return instance;
}
module.exports = { setupStrapi };
```

### Test strapi instance

We need a main entry file for our tests, one that will also test our helper file.

**Path —** `./tests/helpers/strapi.js`

```js
const fs = require('fs');
const { setupStrapi } = require('./helpers/strapi');

/** this code is called once before any test is called */
beforeAll(async (done) => {
  await setupStrapi(); // singleton so it can be called many times
  done();
});

/** this code is called once before all the tested are finished */
afterAll(async (done) => {
  const dbSettings = strapi.config.get('database.connections.default.settings');

  //delete test database after all tests
  if (dbSettings && dbSettings.filename) {
    const tmpDbFile = `${__dirname}/../${dbSettings.filename}`;
    if (fs.existsSync(tmpDbFile)) {
      fs.unlinkSync(tmpDbFile);
    }
  }
  done();
});

it('strapi is defined', async (done) => {
  expect(strapi).toBeDefined();
  done();
});
```

Actually this is all we need for writing unit tests. Just run `yarn test` and see a result of your first test

```bash
yarn run v1.13.0
$ jest
 PASS  tests/app.test.js
  ✓ strapi is defined (2 ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Snapshots:   0 total
Time:        4.187 s
Ran all test suites.
✨  Done in 5.73s.
```

### Testing basic endpoint controller.

::: tip
In the example we'll use and example `Hello world` `/hello` endpoint from [controllers](../concepts/controllers.md#example) section.
:::

We'll test if our endpoint works propelly and route `/hello` does return `Hello World`

Let's create a separate test file were `supertest` will be used to check if endpoint works as expected.

**Path —** `./tests/hello/index.js`

```js
const request = require('supertest');

it('should return hello world', async (done) => {
  await request(strapi.server) // app server is an instance of Class: http.Server
    .get('/hello')
    .expect(200) // Expect response http code 200
    .then((data) => {
      expect(data.text).toBe('Hello World!'); // expect the response text
    });
  done();
});
```

Then include this code to `./tests/app.test.js` at the bottom of that file

```js
require('./hello');
```

and run `yarn test` which should return

```bash
➜  my-project yarn test
yarn run v1.13.0
$ jest --detectOpenHandles
 PASS  tests/app.test.js (5.742 s)
  ✓ strapi is defined (4 ms)
  ✓ should return hello world (208 ms)

[2020-05-22T14:37:38.018Z] debug GET /hello (58 ms) 200
Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
Snapshots:   0 total
Time:        6.635 s, estimated 7 s
Ran all test suites.
✨  Done in 9.09s.
```

### Testing `auth` endpoint controller.

In this scenario we'll test authentication login endpoint with two tests

1. Test `/auth/local` that should login user and return `jwt` token
2. Test `/users/me` that should return users data based on `Authorization` header

**Path —** `./tests/user/index.js`

```js
const request = require('supertest');

// user mock data
const mockUserData = {
  username: 'tester',
  email: 'tester@strapi.com',
  provider: 'local',
  password: '1234abc',
  confirmed: true,
  blocked: null,
};

it('should login user and return jwt token', async (done) => {
  /** Creates a new user and save it to the database */
  await strapi.plugins['users-permissions'].services.user.add({
    ...mockUserData,
  });

  await request(strapi.server) // app server is an instance of Class: http.Server
    .post('/auth/local')
    .set('accept', 'application/json')
    .set('Content-Type', 'application/json')
    .send({
      identifier: mockUserData.email,
      password: mockUserData.password,
    })
    .expect('Content-Type', /json/)
    .expect(200)
    .then((data) => {
      expect(data.body.jwt).toBeDefined();
    });

  done();
});

it('should return users data for authenticated user', async (done) => {
  /** Gets the default user role */
  const defaultRole = await strapi.query('role', 'users-permissions').findOne({}, []);

  const role = defaultRole ? defaultRole.id : null;

  /** Creates a new user an push to database */
  const user = await strapi.plugins['users-permissions'].services.user.add({
    ...mockUserData,
    username: 'tester2',
    email: 'tester2@strapi.com',
    role,
  });

  const jwt = strapi.plugins['users-permissions'].services.jwt.issue({
    id: user.id,
  });

  await request(strapi.server) // app server is an instance of Class: http.Server
    .get('/users/me')
    .set('accept', 'application/json')
    .set('Content-Type', 'application/json')
    .set('Authorization', 'Bearer ' + jwt)
    .expect('Content-Type', /json/)
    .expect(200)
    .then((data) => {
      expect(data.body).toBeDefined();
      expect(data.body.id).toBe(user.id);
      expect(data.body.username).toBe(user.username);
      expect(data.body.email).toBe(user.email);
    });

  done();
});
```

Then include this code to `./tests/app.test.js` at the bottom of that file

```js
require('./user');
```
