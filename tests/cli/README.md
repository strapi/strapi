# CLI Tests

## Running the tests

Run `yarn test:cli` to begin. The command will generate the required number of test applications based on the CLI app-template, seed them with preconfigured data [not yet implemented], then run the test suites (or "domains").

The `-c X` option can be used to limit the number of concurrently running domains, where `X` is the number to be run simultaneously.

If any changes are made to the template, or other issues are being encountered, try removing and regenerating the test apps by using `yarn test:cli:clean` before running the tets.

## Writing tests

The [coffee](https://github.com/node-modules/coffee) library is used to run commands and expect input, complete prompts, etc. Please see their documentation for more details.

Warning: Due to issues with the monorepo in regards to linking packages, we currently have to use 'npm' instead of 'yarn' to run internal CLI commands

### Accessing test app information

When a test domain is run, the path to the available test app is provided in the comma-separated env variable TEST_APPS. The number of apps provided will be the number of testApps set in the configuration, or the default of 1.

For example, if 2 test apps are requested, you should receive an env such as: `TEST_APPS=/test-apps/cli/test-app-0,/test-apps/cli/test-app-3`

Your CLI commands being tested can then be run in that directory.

#### Keeping an app running

As the CLI generally does not require a running Strapi app, this is not managed by the CLI testing tool.

After tests for remote data-transfer are implemented, there will be utility functions available to assist in running one or more of the test apps in the background while other tests are run against it.

### Structure

Each subdirectory within the `./tests` directory here is considered a test "domain" and will have its own test app(s) available. By default only one test app is made available unless additional ones are configured in a config.js within that test domain.

#### tests/{domain}/config.js

This optional file should return a function that returns a configuration object like the following complete example:

```typescript
module.exports = () => {
  return {
    testApps: 2, // the number of test apps to be made available
  };
};
```

### How to run and test CLI commands

See the available tests in the `tests` directory for examples.
