<p align="center">
  <a href="https://strapi.io">
    <img src="https://blog.strapi.io/content/images/2017/10/logo.png" width="318px" alt="Strapi logo" />
  </a>
</p>
<h3 align="center">API creation made simple, secure and fast.</h3>
<p align="center">The most advanced open-source Headless-CMS to build powerful APIs with no effort.</p>
<br />
<p align="center">
  <a href="https://www.npmjs.org/package/strapi">
    <img src="https://img.shields.io/npm/v/strapi/beta.svg" alt="NPM Version" />
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

Strapi is a free and open-source Headless CMS delivering your content anywhere you need.

- **Keep control over your data**. With Strapi, you know where your data is stored and you keep full control at any time.
- **Self hosted**. You can host and scale Strapi projects the way you want. You can choose any hosting platform you want: AWS, Netlify, Heroku, a VPS or a dedicated server. You can scale as you grow, 100% independently.
- **Database agnostic**. You can choose the database you prefer. Strapi works with SQL & NoSQL databases: MongoDB, PostgresQL, MySQL, MariaDB, SQLite.
- **Customisable**. You can easily build your own logic by fully customising APIs, routes or plugins to perfectly fit your needs.

## Getting Started

<a href="https://strapi.io/documentation/3.0.0-beta.x/getting-started/quick-start.html" target="_blank">Read the Getting Started tutorial</a> or follow the steps below:

#### 🖐 Requirements

**Supported operating systems**:

- Ubuntu 18.04/Debian 9.x
- CentOS/RHEL 8
- MacOS Mojave
- Windows 10
- Docker - [Docker-Repo](https://github.com/strapi/strapi-docker)

(Please note that Strapi may work on other operating systems, but these are not tested nor officially supported at this time.)

**Node:**

- NodeJS 10.x
- NPM >= 6.x

(Please note that Node 11/12 are not supported, and the current Node LTS (v10) is the officially supported version.)

**Database:**

- MongoDB >= 3.6
- MySQL >= 5.6
- MariaDB >= 10.1
- PostgreSQL >= 10
- SQLite >= 3

#### ⏳ Installation

```bash
npm install strapi@beta -g
```

**We recommend always using the latest version of Strapi to start your new projects**.

This project is currently in **Beta**. Large breaking changes are unlikely at this stage of the project, but using the latest version of Strapi ensures you have all the latest features and updates. New releases are usually shipped every two weeks to fix/enhance the project.

#### 🏗 Create a new project

```bash
strapi new my-project
```

This command will generate a brand new project with the default features (authentication, permissions, content management, content type builder & file upload).

#### 🚀 Start your project

```bash
cd my-project
strapi develop
```

Congratulations, you made it!

Enjoy 🎉

## Features

- **Modern Admin Panel:** Elegant, entirely customizable and a fully extensible admin panel.
- **Secure by default:** Reusable policies, CSRF, CORS, P3P, Xframe, XSS, and more.
- **Plugins Oriented:** Install auth system, content management, custom plugins, and more, in seconds.
- **Blazing Fast:** Built on top of Node.js, Strapi delivers amazing performance.
- **Front-end Agnostic:** Use any front-end framework (React, Vue, Angular, etc.), mobile apps or even IoT.
- **Powerful CLI:** Scaffold projects and APIs on the fly.
- **SQL & NoSQL databases:** Works with Mongo, Postgres, MySQL, MariaDB, SQLite.

**[See more on our website](https://strapi.io/overview)**.

### Try on Heroku

You can also give it a try using Heroku in one click!

<a href="https://heroku.com/deploy?template=https://github.com/strapi/strapi-heroku-app">
  <img src="https://www.herokucdn.com/deploy/button.svg" alt="Deploy">
</a>

Be aware that the Content Type Builder won't work due to the restriction of writing files on the Heroku servers. If you would like to change/edit/add Content Types, you need to follow these steps:

1. Click the button above and deploy your app
2. Clone that repo by using `heroku git:clone -a` followed by your repo's name
3. Go into the cloned projects' folder using `cd` followed by your repo's name
4. Add the Heroku boilerplate as a remote by running `git remote add boilerplate https://github.com/strapi/strapi-heroku-app`
5. Pull from this new origin by running `git pull boilerplate master`

## Contributing

Please read our [Contributing Guide](./CONTRIBUTING.md) before submitting a Pull Request to the project.

## Support

For more information on the upcoming version, please take a look to our [ROADMAP](https://github.com/strapi/strapi/projects).

#### Community support

For general help using Strapi, please refer to [the official Strapi documentation](https://strapi.io/documentation/). For additional help, you can use one of these channels to ask question:

- [StackOverflow](http://stackoverflow.com/questions/tagged/strapi)
- [Slack](http://slack.strapi.io) (Highly recommended for faster support)
- [GitHub](https://github.com/strapi/strapi) (Bug reports, contributions)
- [ProductBoard](https://portal.productboard.com/strapi/tabs/2-under-consideration) (Roadmap, Feature requests)
- [Twitter](https://twitter.com/strapijs) (Get news fast)
- [Facebook](https://www.facebook.com/Strapi-616063331867161)
- [YouTube Channel](https://www.youtube.com/strapi) (Learn from Video Tutorials)

## Migration

Follow our [migration guides](https://github.com/strapi/strapi/wiki) on the wiki to keep your projects up-to-date.

## Roadmap

Check out our [roadmap](https://portal.productboard.com/strapi) to get informed of the latest features released and the upcoming ones. You may also give us insights and vote for a specific feature.

## Sponsors

[Become a sponsor](https://opencollective.com/strapi#sponsor) and get your logo on our README on GitHub with a link to your site.

<a href="https://opencollective.com/strapi#contributors"><img src="https://opencollective.com/strapi/tiers/sponsor.svg"/></a>

## License

[MIT License](LICENSE.md) Copyright (c) 2015-2019 [Strapi Solutions](https://strapi.io/).
