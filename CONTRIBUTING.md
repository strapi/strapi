# Contribute to Strapi

👍🎉 First off, thanks for taking the time to contribute! 🎉👍

The following is a set of guidelines for contributing to Strapi and its packages.

Strapi is an open-source project administered by [the Strapi team](https://strapi.io/company).

Before contributing, ensure that your effort is aligned with the project's roadmap by talking to the maintainers, especially if you are going to spend a lot of time on it. Feel free to [join us on Slack](http://slack.strapi.io) if you are interested in helping us or [drop us an email](mailto:hi@strapi.io) if you are interested in working with us.

## Code of Conduct

This project and everyone participating in it is governed by the [Strapi Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [hi@strapi.io](mailto:hi@strapi.io).

## Open Development & Community Driven
Strapi is open-source under the [MIT license](https://github.com/strapi/strapi/blob/master/LICENSE.md). All the work done is available on GitHub.
The core team and the contributors send pull requests which go through the same validation process.

Every user can send a feature request using the [issues](https://github.com/strapi/strapi/issues/new?template=FEATURE_REQUEST.md) on GitHub. Feel free to upvote 👍 [existing feature request](https://github.com/strapi/strapi/issues?q=is%3Aopen+is%3Aissue+label%3A%22type%3A+feature+request+%F0%9F%99%8F%22)

## Repository Organization
We made the choice to use a monorepo design such as [React](https://github.com/facebook/react/tree/master/packages), [Babel](https://github.com/babel/babel/tree/master/packages), [Meteor](https://github.com/meteor/meteor/tree/devel/packages) or [Ember](https://github.com/emberjs/ember.js/tree/master/packages) do. It allows the community to easily maintain the whole ecosystem up-to-date and consistent.

The Babel team wrotes an excellent short post about [the pros and cons of the monorepo design](https://github.com/babel/babel/blob/master/doc/design/monorepo.md).

We will do our best to keep the master branch clean as possible, with tests passing all the times. However, it can happen that the master branch moves faster than the release cycle. To ensure to use the latest stable version, please refers to the [release on npm](https://www.npmjs.com/package/strapi).

If you send a pull request, please do it again the `master` branch. We are developing upcoming versions separately to ensure non-breaking changes from master to the latest stable major version.

***

## Setup Development Environment
To facilitate the contribution, we drastically reduce the amount of commands necessary to install the entire development environment. First of all, you need to check if you're using the recommended versions of Node.js (v8) and npm (v5).

Then, please follow the instructions below:

#### 1. Fork the repository

[Go to the repository](https://github.com/strapi/strapi) and fork it to your own GitHub account.

#### 2. Clone the repository

```bash
git clone git@github.com:strapi/strapi.git
```

#### 3. ⏳ Installation
 
Go to the root of the repository.
```bash
cd strapi
```

**Two setup are available... with or without the front-end build.**

Without the front-end build, you won't be able to access to the administration panel via http://localhost:1337/admin, you'll have to run the administration separately and access it through http://localhost:4000/admin.

<br>

Without the front-end build (recommended)
```bash
npm run setup
```
or with the front-end builds
```bash
npm run setup:build
```

> ⚠️  If the installation failed, please remove the global packages related to Strapi. The command `npm ls strapi` will help you to find where your packages are installed globally.

#### 4. 🏗 Create a new project

You can open a new terminal window and go into any folder you want for the next steps.
```bash
cd /.../workspace/
```

The command to generate a project is the same, except you have to add the `--dev` argument at the end of line.
```bash
strapi new my-project --dev
```

#### 5. 🚀 Start the project

First, you have to start the server.
```bash
cd ./my-project
strapi start
```

The server (API) is available at http://localhost:1337

> ⚠️  If you've followed the recommended setup, you should not be able to reach the administration panel at http://localhost:1337/admin.

Then, you have to start the Webpack server to build and run the administration.
```bash
cd ./my-project/admin
npm run start
```

The administration panel is available at http://localhost:4000/admin

**Awesome! You are now able to contribute to Strapi.**

---

## Plugin Development Setup

To create a new plugin, you'll have to run the following commands:

#### 1. Generate a new plugin

```bash
cd ./my-project
strapi generate:plugin my-plugin
```

#### 2. Verify the symlink

Make you that the `strapi-helper-plugin` is linked to your project.

Please run this command in the repository folder where Strapi is cloned:
```bash
cd /repository/strapi/packages/strapi-helper-plugin
npm link
```

Link the `strapi-helper-plugin` node_modules in the plugin folder:
```bash
cd ./my-project/plugins/my-plugin
npm link strapi-helper-plugin
```

#### 3. Start the project

```bash
cd ./my-project/admin
npm run start
```

The administration panel is available at http://localhost:4000/admin

---

## Reporting an issue

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
    * no dependencies are linked (e.g. you haven't run `npm link`)
    * that you haven't made any inline changes to files in the `node_modules` folder
    * that you don't have any weird global dependency loops. The easiest way to double-check any of the above, if you aren't sure, is to run: `$ rm -rf node_modules && npm cache clear && npm install`.
