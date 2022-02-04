# Contribute to Strapi

Strapi is an open-source project administered by [the Strapi team](https://strapi.io/about-us). We appreciate your interest and efforts to contribute to Strapi. See the [LICENSE](https://github.com/strapi/strapi/blob/master/LICENSE) licensing information. All work done is available on GitHub.

We highly appreciate your effort to contribute, but we recommend you to talk to a maintainer prior to spending a lot of time making a pull request that may not align with the project roadmap. Every pull request, whether is from strapi or contributors, goes through the same process.

## Feature Requests

Feature Requests by the community are highly encouraged. Feel free to submit a new one or upvote an existing feature request on [ProductBoard](https://portal.productboard.com/strapi).

## Request For Comments (RFCs)

Larger changes in Strapi require a thourough design phase before starting working on a PR.

The Request For Comments (RFC) process will help us create consensus among the core team and include as much feedback as possible from the community, for these upcoming changes.

Before contributing larger chunks of code that might affect core functionalities, you will have to create a public RFC on the [strapi/rfcs](https://github.com/strapi/rfcs) repository.

## Code of Conduct

This project and everyone participating in it, are governed by the [Strapi Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold it. Make sure to read the [full text](CODE_OF_CONDUCT.md), to understand which type of actions may or may not be tolerated.

## Contributor License Agreement (CLA)

### Individual

In order to accept your pull request, we need you to submit a CLA. You only need to do this once. If you are submitting a pull request for the first time, you can complete your CLA [here](https://cla.strapi.io/strapi/strapi) or just submit a pull request and our CLA Bot will ask you to sign the CLA before merging it.

### Company

If you are making contributions to our repositories on behalf of your company, then we will need a Corporate Contributor License Agreement (CLA) signed. In order to do that, please contact us at [contributions@strapi.io](mailto:contributions@strapi.io).

## Documentation

Pull requests relating to fixing documentation for the latest release should be directed towards the [documentation repo](https://github.com/strapi/documentation). Please see the documentation [contributing guide](https://github.com/strapi/documentation/blob/main/CONTRIBUTING.md) for more information.

## Bugs

We are using [GitHub Issues](https://github.com/strapi/strapi/issues) to manage our public bugs. We keep a close eye on them. Before filing a new issue, try to make sure your problem does not already exist.

---

## Before Submitting a Pull Request

The core team will review your pull request and will either merge it, request changes to it, or close it.

**Before submitting your pull request** make sure the following requirements are fulfilled:

- Fork the repository and create your branch from `master`.
- Run `yarn setup` in the root of the repository.
- If you’ve fixed a bug or added code that should be tested, please make sure to add tests
- Ensure the test suites are passing:
  - `yarn test:unit`
  - `yarn test:front`
- Make sure your code lints (`yarn lint`).
- If your contribution fixes an existing issue, please make sure to link it in your pull request.

## Contribution Prerequisites

- You have [Node.js](https://nodejs.org/en/) at version >= v12 and <= v16 and [Yarn](https://yarnpkg.com/en/) at v1.2.0+ installed.
- You are familiar with [Git](https://git-scm.com).

## Development Workflow

_For users running on Apple Silicon M1, you may encounter errors thrown by `sharp`. You may need to re-install `libvps` or to build `sharp` manually following [this issue comment](https://github.com/lovell/sharp/issues/2460#issuecomment-751491241) in order to start the project._

First of all, you need to check if you are using the [required versions of Node.js and npm](https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/deployment.html).

Now, please follow the instructions below:

#### 1. Fork the [repository](https://github.com/strapi/strapi)

[Go to the repository](https://github.com/strapi/strapi) and fork it using your own GitHub account.

#### 2. Clone from your repository

```bash
git clone git@github.com:YOUR_USERNAME/strapi.git
```

#### 3. Install the dependencies

Go to the root of the repository and run the common setup:

```bash
cd strapi
yarn setup
```

#### 4. Start the example application

```bash
cd ./examples/getstarted
yarn develop
```

Make sure to read the [`getstarted` application README](./examples/getstarted/README.md) for more details.

#### 5. Running the administration panel in development mode

Start the administration panel server for development:

```bash
cd ./packages/core/admin
yarn develop
```

The administration panel should now be available at http://localhost:4000/admin

**Awesome! You are now able to contribute to Strapi.**

#### 6. Available commands

- `yarn watch` starts yarn watch in all packages.
- `yarn build` builds the `strapi-helper-plugin` (use this command when you develop in the administration panel).
- `yarn setup` installs dependencies.
- `yarn lint` lints the codebase.
- `yarn test:clean` removes the coverage reports.
- `yarn test:front` runs front-end related tests.
- `yarn test:front:watch` runs an interactive test watcher for the front-end.
- `yarn test:unit` runs the back-end unit tests.
- `yarn test:e2e` runs an end-to-end test suite.
- `yarn test:generate-app` generates a test application.
- `yarn test:start-app` starts the test application.

---

## Running the e2e tests

The end-to-end tests require a Strapi app to be able to run. You can generate a "test app" using `yarn test:generate-app <database>`:

```bash
$ yarn test:generate-app sqlite
$ yarn test:generate-app postgres
$ yarn test:generate-app mysql
```

You require a new app every time you run the tests. Otherwise, the test suite will fail. A script is available to make this process easier: `node test/e2e.js`. It'll delete the current test app, generate a new one, and run the test suite.

**Changing the database:**

By default the script `test/e2e,js` creates an app that uses `sqlite`. But you can run the test suites using different databases:

```bash
$ node test/e2e.js --db=sqlite
$ node test/e2e.js --db=postgres
$ node test/e2e.js --db=mysql
```

**Running the tests for the Community Editon (CE)**

The test suites will run the tests for the Enterprise Edition (EE) version of Strapi. Should you want to test the Community Edition (CE) version you will need to set the environment variable `STRAPI_DISABLE_EE`:

```bash
$ STRAPI_DISABLE_EE=true node test/e2e.js
$ STRAPI_DISABLE_EE=true yarn test:e2e
```

**Specifying a license to use for the Enterprise Edition (EE) e2e tests**

The Enterprise Edition tests need a valid license to run correctly. To specify which license to use you can use the environment variable `STRAPI_LICENSE`. You can specify it either in an environment file or before running the CLI command:

```bash
$ STRAPI_LICENSE=<license> node test/e2e.js
$ STRAPI_LICENSE=<license> yarn test:e2e
```

---

## Miscellaneous

### Repository Organization

We chose to use a monorepo design using [Yarn Workspaces](https://yarnpkg.com/en/docs/workspaces) in the way [React](https://github.com/facebook/react/tree/master/packages) or [Babel](https://github.com/babel/babel/tree/master/packages) does. This allows us to maintain the whole ecosystem, keep it up-to-date and consistent.

We do our best to keep the master branch as clean as possible, with tests passing at all times. However, it may happen that the master branch moves faster than the release cycle. Therefore check the [releases on npm](https://www.npmjs.com/package/@strapi/strapi) so that you are always up-to-date with the latest stable version.

### Reporting an issue

Before submitting an issue you need to make sure:

- You are experiencing a technical issue with Strapi.
- You have already searched for related [issues](https://github.com/strapi/strapi/issues), and found none open (if you found a related _closed_ issue, please link to it from your post).
- You are not asking a question about how to use Strapi or about whether or not Strapi has a certain feature. For general help using Strapi, you may:
  - Refer to [the official Strapi documentation](https://docs.strapi.io).
  - Ask a member of the community in the [Strapi Discord Community](https://discord.strapi.io/).
  - Ask a question on [our community forum](https://forum.strapi.io).
- Your issue title is concise, on-topic and polite.
- You can and do provide steps to reproduce your issue.
- You have tried all the following (if relevant) and your issue remains:
  - Make sure you have the right application started.
  - Make sure the [issue template](.github/ISSUE_TEMPLATE) is respected.
  - Make sure your issue body is readable and [well formatted](https://guides.github.com/features/mastering-markdown).
  - Make sure you've killed the Strapi server with CTRL+C and started it again.
  - Make sure the application you are using to reproduce the issue has a clean `node_modules` directory, meaning:
    - no dependencies are linked (e.g. you haven't run `yarn link`)
    - that you haven't made any inline changes to files in the `node_modules` folder
    - that you don't have any weird global dependency loops. The easiest way to double-check any of the above, if you aren't sure, is to run: `$ rm -rf node_modules && yarn cache clean && yarn`.
