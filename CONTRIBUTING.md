## Contribute to the project


### Open Development & Community Driven
Strapi is open-source under the [MIT license](https://github.com/strapi/strapi/blob/master/LICENSE.md). All the work done is available on GitHub.
The core team and the contributors send pull requests which go through the same validation process.

Every user can send a feature request using the [issues](https://github.com/strapi/strapi/issues) on GitHub.

-----

### Repository Organization
We made the choice to use a monorepo design such as [React](https://github.com/facebook/react/tree/master/packages), [Babel](https://github.com/babel/babel/tree/master/packages), [Meteor](https://github.com/meteor/meteor/tree/devel/packages) or [Ember](https://github.com/emberjs/ember.js/tree/master/packages) do. It allows the community to easily maintain the whole ecosystem up-to-date and consistent.

The Babel team wrotes an excellent short post about [the pros and cons of the monorepo design](https://github.com/babel/babel/blob/master/doc/design/monorepo.md).

We will do our best to keep the master branch clean as possible, with tests passing all the times. However, it can happen that the master branch moves faster than the release cycle. To ensure to use the latest stable version, please refers to the [release on npm](https://www.npmjs.com/package/strapi).

If you send a pull request, please do it again the `master` branch. We are developing upcoming versions separately to ensure non-breaking changes from master to the latest stable major version.

-----

### Setup Development Environment
To facilitate the contribution, we drastically reduce the amount of commands necessary to install the entire development environment. First of all, you need to check if you're using the recommended versions of Node.js (v8) and npm (v5).

**Then, please follow the instructions below:**

1. [Fork the repository](https://github.com/strapi/strapi) to your own GitHub account.
2. Clone it to your computer `git clone git@github.com:strapi/strapi.git`.
3. Run `npm run setup` at the root of the directory.

> Note: If the installation failed, please remove the global packages related to Strapi. The command `npm ls strapi` will help you to find where your packages are installed globally.

The development environment has been installed. Now, you have to create a development project to live-test your updates.

1. Go to a folder on your computer `cd /path/to/my/folder`.
2. Create a new project `strapi new myDevelopmentProject --dev`.
3. Start your app with `strapi start`.

Awesome! You are now able to make bug fixes or enhancements in the framework layer of Strapi. **To make updates in the administration panel, you need to go a little bit further.**

4. Open a new tab or new terminal window.
5. Go to the `/admin` folder of your currently running app.
5. Run `npm start` and go to the following url [http://localhost:4000/admin](http://localhost:4000/admin)
