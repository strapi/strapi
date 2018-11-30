<p align="center">
  <strong>We're hiring!</strong> Located in Paris 🇫🇷 and dreaming of being full-time on Strapi?
  <a href="https://strapi.io/company#looking-for-talents">Join us</a>!
</p>

---

<p align="center">
  <a href="https://strapi.io">
    <img src="https://blog.strapi.io/content/images/2017/10/logo.png" width="318px" alt="Strapi logo" />
  </a>
</p>
<h3 align="center">API creation made simple, secure and fast.</h3>
<p align="center">The most advanced open-source Content Management Framework (headless-CMS) to build powerful API with no effort.</p>
<br />
<p align="center">
  <a href="https://www.npmjs.org/package/strapi">
    <img src="https://img.shields.io/npm/v/strapi/alpha.svg" alt="NPM Version" />
  </a>
  <a href="https://www.npmjs.org/package/strapi">
    <img src="https://img.shields.io/npm/dm/strapi.svg" alt="Monthly download on NPM" />
  </a>
  <a href="https://travis-ci.org/strapi/strapi">
    <img src="https://travis-ci.org/strapi/strapi.svg?branch=master" alt="Travis Build Status" />
  </a>
  <a href="http://slack.strapi.io">
    <img src="https://strapi-slack.herokuapp.com/badge.svg" alt="Strapi on Slack" />
  </a>
</p>

<br>

<p align="center">
  <a href="https://strapi.io">
    <img src="https://blog.strapi.io/content/images/2018/08/github_preview-2.png" />
  </a>
</p>

<br>

## Getting Started

<a href="https://strapi.io/getting-started" target="_blank">Read the Getting Started tutorial</a> or follow the steps below:

#### 🖐 Requirements

Operating system:
 * Ubuntu/Debian
 * CentOS/RHEL
 * MacOS
 * Windows - [WSL Only](https://github.com/strapi/strapi/wiki/Frequently-Asked-Questions#windows)
 * Docker - [Docker-Repo](https://github.com/strapi/strapi-docker)

**Please note that Strapi may work on other Operating Systems, but are not tested at this time.**

Node:
 * NodeJS >= 10.x
 * NPM >= 6.x

**Please note that right now Node 11 is not Officially supported, and the current Node LTS (v10) should be used.**

Database:
 * MongoDB >= 3.x 
 * MySQL >= 5.6
 * MariaDB >= 10.1
 * PostgreSQL >= 10

#### ⏳ Installation

```bash
npm install strapi@alpha -g
````

**We recommend to use the latest version of Strapi to start your new project**. 
Some breaking changes might happen, new releases are shipped every two weeks to fix/enhance the product.

#### 🏗 Create a new project

```bash
strapi new my-project
```

It will generate a brand new project with the default features (authentication, permissions, content management, content type builder & file upload).

#### 🚀 Start your project

```bash
cd my-project
strapi start
```

Congratulations, you made it! Enjoy 🎉

### Try on Heroku

You can also give it a try using Heroku in one click!

<a href="https://heroku.com/deploy?template=https://github.com/strapi/strapi-heroku-app">
  <img src="https://www.herokucdn.com/deploy/button.svg" alt="Deploy">
</a>

Be aware that one of the content type builder won't work due to the writing files restriction on the Heroku servers. If you do want to change content types, you need to follow these steps:

1. Click the button above and deploy your app
2. Clone that repo by using `heroku git:clone -a ` followed by your repo's name
3. Go into the cloned projects' folder using `cd` followed by your repo's name
4. Add the Heroku boilerplate as a remote by running `git remote add boilerplate https://github.com/strapi/strapi-heroku-app`
5. Pull from this new origin by running `git pull boilerplate master`

## Features

- **Modern Admin Panel:**
  Elegant, entirely customizable and fully extensible admin panel.
- **Secure by default:** Reusable policies, CSRF, CORS, P3P, Xframe, XSS, and more.
- **Plugins Oriented:** Install auth system, content management, custom plugins, and more, in seconds.
- **Blazing Fast:** Built on top of Node.js, Strapi delivers amazing performances.
- **Front-end Agnostic:** Use any front-end frameworks (React, Vue, Angular, etc.), mobile apps or even IoT.
- **Powerful CLI:** Scaffold projects and APIs on the fly.
- **SQL & NoSQL databases:** Work with Mongo as a main database, also supports Postgres, MySQL, etc.

**[See more on our website](https://strapi.io/overview)**

## Contributing

Please read our [Contributing Guide](./CONTRIBUTING.md) before submitting a Pull Request to the project.

## Support

For more information on the upcoming version, please take a look to our [ROADMAP](https://github.com/strapi/strapi/projects).

#### Community support

For general help using Strapi, please refer to [the official Strapi documentation](https://strapi.io/documentation/). For additional help, you can use one of this channel to ask question:

- [StackOverflow](http://stackoverflow.com/questions/tagged/strapi)
- [Slack](http://slack.strapi.io) (highly recommended for realtime support)
- [GitHub](https://github.com/strapi/strapi)
- [Twitter](https://twitter.com/strapijs)
- [Facebook](https://www.facebook.com/Strapi-616063331867161).

#### Professional support

[Strapi Solutions](https://strapi.io), the company behind Strapi, provides a full range of solutions to get better results, faster. We're always looking for the next challenge: coaching, consulting, training, customization, etc. 

[Drop us an email](mailto:support@strapi.io) to see how we can help you.

## Migration

Follow our [migration guides](https://github.com/strapi/strapi/wiki) on the wiki to keep your projects up-to-date.

## Roadmap

Check out our [roadmap](https://portal.productboard.com/strapi) to get informed by the latest feature released and the upcoming ones. You can also give us insights and vote for a specific feature.

## License

[MIT License](LICENSE.md) Copyright (c) 2015-2018 [Strapi Solutions](https://strapi.io/).
