# create-strapi-app domain

CLI tests for the `create-strapi-app` package. This domain uses **`testApps: 0`** (see `config.js`): tests spawn the built `bin/index.js` and write to a temp directory instead of using `TEST_APPS`.

Run only this domain: `yarn test:cli --domains create-strapi-app`

Build first: `yarn workspace create-strapi-app build`
