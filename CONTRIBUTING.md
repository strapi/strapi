# Contribute to Strapi

First off, thanks for taking the time to contribute! 🎉👍

The following is a set of guidelines for contributing to Strapi and its packages.

Strapi is an open-source project administered by [the Strapi team](https://strapi.io/company).

Before contributing, ensure that your effort is aligned with the project's roadmap by talking to the maintainers, especially if you are going to spend a lot of time on it. Feel free to [join us on Slack](http://slack.strapi.io) or [drop us an email](mailto:hi@strapi.io) if you are interested in helping us or working with us.

## Open Development & Community Driven

Strapi is open-source under the [MIT license](https://github.com/strapi/strapi/blob/master/LICENSE.md). All the work done is available on GitHub.
The core team and the contributors send pull requests which go through the same validation process.

Every user can send a feature request using the [issues](https://github.com/strapi/strapi/issues/new?template=FEATURE_REQUEST.md) on GitHub. Feel free to upvote 👍 [existing feature request](https://portal.productboard.com/strapi)

## Code of Conduct

This project and everyone participating in it is governed by the [Strapi Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please read the [full text](CODE_OF_CONDUCT.md) so that you can understand what actions will and will not be tolerated.

## Bugs

We are using [GitHub Issues](https://github.com/strapi/strapi/issues) to manage our public bugs. We keep a close eye on this so before filling a new issue, try to make sure the problem does not already exist.

## Get in Touch

- [Slack](https://slack.strapi.io/)
- [Spectrum](https://spectrum.chat/strapi?tab=posts)

---

## Before Submitting a Pull Request

The core team will review your pull request and will either merge it, request changes to it, or close it.

**Before submitting your pull request** make sure the following requirements are fulfilled:

- Fork the repository and create your branch from `master`.
- Run `yarn setup` in the repository root.
- If you’ve fixed a bug or added code that should be tested, add tests and link the corresponding issue in either your commit or your PR!
- Ensure the test suite passes:
  - `yarn test:unit`
  - `yarn test:front`
- Make sure your code lints (`yarn lint`).

## Contribution Prerequisites

- You have [Node](https://nodejs.org/en/) at v10.0.0 only and [Yarn](https://yarnpkg.com/en/) at v1.2.0+.
- You are familiar with Git.

## Development Workflow

To facilitate the contribution, we drastically reduce the amount of commands necessary to install the entire development environment. First of all, you need to check if you're using the [required versions of Node.js and npm](https://strapi.io/documentation/3.x.x/getting-started/install-requirements.html)

Then, please follow the instructions below:

#### 1. ▪ Fork the [repository](https://github.com/strapi/strapi)

[Go to the repository](https://github.com/strapi/strapi) and fork it to your own GitHub account.

#### 2. 💿 Clone from your repository

```bash
git clone git@github.com:YOUR_USERNAME/strapi.git
```

#### 3. ⏳ Install the dependencies

Go to the root of the repository.

```bash
cd strapi && yarn setup
```

#### 4. 🚀 Start the example application

**Go to the getstarted application**

```bash
cd strapi/examples/getstarted
yarn develop
```

The server (API) is available at http://localhost:1337

> ⚠️  If you've followed the recommended setup, you should not be able to reach the administration panel at http://localhost:1337/admin.

**Start the administration panel server**

```bash
cd strapi/packages/strapi-admin
yarn develop
```

The administration panel is available at http://localhost:4000/admin

**Awesome! You are now able to contribute to Strapi.**

#### 5. Available commands

- `yarn watch` starts yarn watch in all packages.
- `yarn build` builds the `strapi-helper-plugin` (use this command when you develop in the administration panel).
- `yarn setup` installs the dependencies.
- `yarn lint` lints the codebase.
- `yarn test:clean` removes the coverage.
- `yarn test:front` runs the front-end related tests.
- `yarn test:front:watch` runs an interactive test watcher for the front-end.
- `yarn test:snyk` checks the dependencies vulnerabilities.
- `yarn test:unit` runs the back-end unit tests.
- `yarn test:e2e` runs an end-to-end test suite.
- `yarn test:generate-app` generates a test application.
- `yarn test:start-app` starts the test application.

---

## Running the tests

You can run three different kind of tests:

**Changing the database:**

```bash
$ node test/e2e.js sqlite
$ node test/e2e.js mongo
$ node test/e2e.js postgres
$ node test/e2e.js mysql
```

---

## Additional informations

### Repository Organization

We made the choice to use a monorepo design such as [React](https://github.com/facebook/react/tree/master/packages), [Babel](https://github.com/babel/babel/tree/master/packages), [Meteor](https://github.com/meteor/meteor/tree/devel/packages) or [Ember](https://github.com/emberjs/ember.js/tree/master/packages) do. It allows the community to easily maintain the whole ecosystem up-to-date and consistent.

The Babel team wrote an excellent short post about [the pros and cons of the monorepo design](https://github.com/babel/babel/blob/master/doc/design/monorepo.md).

We will do our best to keep the master branch as clean as possible, with tests passing all the times. However, it can happen that the master branch moves faster than the release cycle. To ensure you have the latest stable version, please refer to the [release on npm](https://www.npmjs.com/package/strapi).

If you send a pull request, please do it against the `master` branch. We are developing upcoming versions separately to ensure non-breaking changes from master to the latest stable major version.

### Reporting an issue

Before reporting an issue you need to make sure:

- You are experiencing a concrete technical issue with Strapi (ideas and feature proposals should happen [on Slack](http://slack.strapi.io)).
- You are not asking a question about how to use Strapi or about whether or not Strapi has a certain feature. For general help using Strapi, please refer to [the official Strapi documentation](http://strapi.io). For additional help, ask a question on [StackOverflow](http://stackoverflow.com/questions/tagged/strapi).
- You have already searched for related [issues](https://github.com/strapi/strapi/issues), and found none open (if you found a related _closed_ issue, please link to it in your post).
- Your issue title is concise, on-topic and polite.
- You can provide steps to reproduce this issue that others can follow.
- You have tried all the following (if relevant) and your issue remains:
  - Make sure you have the right application started.
  - Make sure you've killed the Strapi server with CTRL+C and started it again.
  - Make sure you closed any open browser tabs pointed at `localhost` before starting Strapi.
  - Make sure you do not have any other Strapi applications running in other terminal windows.
  - Make sure the application you are using to reproduce the issue has a clean `node_modules` directory, meaning:
    - no dependencies are linked (e.g. you haven't run `npm link`)
    - that you haven't made any inline changes to files in the `node_modules` folder
    - that you don't have any weird global dependency loops. The easiest way to double-check any of the above, if you aren't sure, is to run: `$ rm -rf node_modules && npm cache clear && npm install`.
