# Contribute to the project

Strapi is an open-source project administered by [the Strapi team](http://strapi.io).

We welcome and encourage everyone who want to help us on Strapi.

Before contributing, ensure that your effort is aligned with the project's roadmap by talking to the maintainers, especially if you are going to spend a lot of time on it. Feel free to [join us on Slack](http://slack.strapi.io) if you are interested in helping us or [drop us an email](mailto:hi@strapi.io) if you are interested in working with us.

### Open Development & Community Driven
Strapi is open-source under the [MIT license](https://github.com/strapi/strapi/blob/master/LICENSE.md). All the work done is available on GitHub.
The core team and the contributors send pull requests which go through the same validation process.

Every user can send a feature request using the [issues](https://github.com/strapi/strapi/issues) on GitHub.


### Repository Organization
We made the choice to use a monorepo design such as [React](https://github.com/facebook/react/tree/master/packages), [Babel](https://github.com/babel/babel/tree/master/packages), [Meteor](https://github.com/meteor/meteor/tree/devel/packages) or [Ember](https://github.com/emberjs/ember.js/tree/master/packages) do. It allows the community to easily maintain the whole ecosystem up-to-date and consistent.

The Babel team wrotes an excellent short post about [the pros and cons of the monorepo design](https://github.com/babel/babel/blob/master/doc/design/monorepo.md).

We will do our best to keep the master branch clean as possible, with tests passing all the times. However, it can happen that the master branch moves faster than the release cycle. To ensure to use the latest stable version, please refers to the [release on npm](https://www.npmjs.com/package/strapi).

If you send a pull request, please do it again the `master` branch. We are developing upcoming versions separately to ensure non-breaking changes from master to the latest stable major version.


### Setup Development Environment
To facilitate the contribution, we drastically reduce the amount of commands necessary to install the entire development environment. First of all, you need to check if you're using the recommended versions of Node.js (v8) and npm (v5).

**Then, please follow the instructions below:**

1. [Fork the repository](https://github.com/strapi/strapi) to your own GitHub account.
2. Clone it to your computer `git clone git@github.com:strapi/strapi.git`.
3. Run `npm run setup` at the root of the directory.

> Note: If the installation failed, please remove the global packages related to Strapi. The command `npm ls strapi` will help you to find where your packages are installed globally.

> Note: You can run `npm run setup:build` to build the plugins' admin (the setup time will be longer).


The development environment has been installed. Now, you have to create a development project to live-test your updates.

1. Go to a folder on your computer `cd /path/to/my/folder`.
2. Create a new project `strapi new myDevelopmentProject --dev`.
3. Start your app with `strapi start`.

Awesome! You are now able to make bug fixes or enhancements in the framework layer of Strapi. **To make updates in the administration panel, you need to go a little bit further.**

4. Open a new tab or new terminal window.
5. Go to the `/admin` folder of your currently running app.
6. Run `npm start` and go to the following url [http://localhost:4000/admin](http://localhost:4000/admin)

### Plugin Development Setup

To create a new plugin, you'll have to run the following commands

1. In your project folder `cd myDevelopmentProject && strapi generate:plugin my-plugin`.
2. Make sure that the `strapi-helper-plugin` is linked to your plugin
  - In the folder where strapi is cloned `cd pathToStrapiRepo/strapi/packages/strapi-helper-plugin && npm link`.
  - In your project folder `cd pathToMyProject/myDevelopmentProject/plugins/my-plugin && npm link strapi-helper-plugin`.
3. Start the server in the admin folder `cd pathToMyProject/myDevelopmentProject/admin && npm start` and go to the following url [http://localhost:4000/admin](http://localhost:4000/admin).

***

## Maintainers

- Aurélien Georget ([@aurelsicoko](https://github.com/aurelsicoko)) (Strapi)
- Jim Laurie ([@lauriejim](https://github.com/lauriejim)) (Strapi)
- Pierre Burgy ([@pierreburgy](https://github.com/pierreburgy)) (Strapi)
- Cyril Lopez ([@soupette](https://github.com/soupette)) (Strapi)

The Strapi team have npm publishing rights for modules and also has the final say on releasing new versions.

***

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

***

## Code of Conduct

[The Strapi team](https://strapi.io/company) is committed to fostering a welcoming community for Strapi. If you encounter any unacceptable behavior, follow these steps to report the issue to the team. We are here to help.

### Our Pledge

In the interest of fostering an open and welcoming environment, we pledge to making participation in our project and our community a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

Examples of behavior that contributes to creating a positive environment include:
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

Examples of unacceptable behavior by participants include:
- The use of sexualized language or imagery and unwelcome sexual attention or advances
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information, such as a physical or electronic address, without explicit permission
- Other conduct which could reasonably be considered inappropriate in a professional setting

### Our responsibilities

The Strapi team is responsible for clarifying the standards of acceptable behavior and is expected to take appropriate and fair corrective action in response to any instances of unacceptable behavior.

The Strapi team has the right and responsibility to remove, edit, or reject comments, commits, code, wiki edits, issues, and other contributions that are not aligned to this Code of Conduct, or to ban temporarily or permanently any contributor for other behaviors that they deem inappropriate, threatening, offensive, or harmful.

### Scope

This Code of Conduct applies both within project spaces and in public spaces when an individual is representing the project or its community. Examples of representing a project or community include using an official project e-mail address, posting via an official social media account, or acting as an appointed representative at an online or offline event. Representation of a project may be further defined and clarified by the Strapi team.

### Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the support team at [support@strapi.io](mailto:support@strapi.io). All complaints will be reviewed and investigated and will result in a response that is deemed necessary and appropriate to the circumstances. The project team is obligated to maintain confidentiality with regard to the reporter of an incident. Further details of specific enforcement policies may be posted separately.

Project maintainers and contributors who do not follow or enforce the Code of Conduct in good faith may face temporary or permanent repercussions as determined by other members of the project's leadership.
