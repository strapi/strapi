<p align="center">
  <a href="https://strapi.io/#gh-light-mode-only">
    <img src="https://strapi.io/assets/strapi-logo-dark.svg" width="318px" alt="Strapi logo" />
  </a>
  <a href="https://strapi.io/#gh-dark-mode-only">
    <img src="https://strapi.io/assets/strapi-logo-light.svg" width="318px" alt="Strapi logo" />
  </a>
</p>

<h3 align="center">Open-source headless CMS, self-hosted or Cloud you’re in control.</h3>
<p align="center">The leading open-source headless CMS, 100% JavaScript/TypeScript, flexible and fully customizable.</p>
<p align="center"><a href="https://cloud.strapi.io/signups?source=github1">Cloud</a> · <a href="https://strapi.io/demo?utm_campaign=Growth-Experiments&utm_source=strapi%2Fstrapi%20README.md">Try live demo</a></p>
<br />

<p align="center">
  <a href="https://www.npmjs.org/package/@strapi/strapi">
    <img src="https://img.shields.io/npm/v/@strapi/strapi/latest.svg" alt="NPM Version" />
  </a>
  <a href="https://github.com/strapi/strapi/actions/workflows/tests.yml">
    <img src="https://github.com/strapi/strapi/actions/workflows/tests.yml/badge.svg?branch=main" alt="Tests" />
  </a>
  <a href="https://discord.strapi.io">
    <img src="https://img.shields.io/discord/811989166782021633?label=Discord" alt="Strapi on Discord" />
  </a>
  <a href="https://github.com/strapi/strapi/actions/workflows/nightly.yml">
    <img src="https://github.com/strapi/strapi/actions/workflows/nightly.yml/badge.svg" alt="Strapi Nightly Release Build Status" />
  </a>
</p>

<br>

<p align="center">
  <a href="https://strapi.io">
    <img src="https://raw.githubusercontent.com/strapi/strapi/main/public/assets/admin-demo.gif" alt="Administration panel" />
  </a>
</p>

<br>

Strapi Community Edition is a free and open-source headless CMS enabling you to manage any content, anywhere.

- **Self-hosted or Cloud**: You can host and scale Strapi projects the way you want. You can save time by deploying to [Strapi Cloud](https://cloud.strapi.io/signups?source=github1) or deploy to the hosting platform you want\*\*: AWS, Azure, Google Cloud, DigitalOcean.
- **Modern Admin Panel**: Elegant, entirely customizable and a fully extensible admin panel.
- **Multi-database support**: You can choose the database you prefer: PostgreSQL, MySQL, MariaDB, and SQLite.
- **Customizable**: You can quickly build your logic by fully customizing APIs, routes, or plugins to fit your needs perfectly.
- **Blazing Fast and Robust**: Built on top of Node.js and TypeScript, Strapi delivers reliable and solid performance.
- **Front-end Agnostic**: Use any front-end framework (React, Next.js, Vue, Angular, etc.), mobile apps or even IoT.
- **Secure by default**: Reusable policies, CORS, CSP, P3P, Xframe, XSS, and more.
- **Powerful CLI**: Scaffold projects and APIs on the fly.

## Getting Started

<a href="https://docs.strapi.io/developer-docs/latest/getting-started/quick-start.html" target="_blank">Read the Getting Started tutorial</a> or follow the steps below:

### ⏳ Installation

Use the **Quickstart** command below to create a new Strapi project instantly:

- We recommend using **yarn** to create a Strapi project.  
  [View yarn installation docs](https://yarnpkg.com/lang/en/docs/install/).

```bash
yarn create strapi
```

**or**

(Using npx to install the Latest Version Strapi project.)

```bash
npx create-strapi@latest
```

This command generates a brand new project with the default features (authentication, permissions, content management, content type builder & file upload).

Enjoy 🎉

### 🖐 Requirements

Complete installation requirements can be found in the documentation under <a href="https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/deployment.html">Installation Requirements</a>.

**Supported operating systems**:

| OS              | Recommended | Minimum    |
| --------------- | ----------- | ---------- |
| Ubuntu          | 24.04       | LTS        |
| Debian          | 11          | LTS        |
| RHEL            | 9           | LTS        |
| macOS           | 14          | 12         |
| Windows Desktop | 11          | 10         |
| Windows Server  | No Support  | No Support |
| Docker          | N/A         | N/A        |

(Please note that Strapi may work on other operating systems, but these are not tested nor officially supported at this time.)

**Node:**

Strapi only supports maintenance and LTS versions of Node.js. Please refer to the <a href="https://nodejs.org/en/about/releases/">Node.js release schedule</a> for more information. NPM versions installed by default with Node.js are supported. Generally it's recommended to use yarn over npm where possible.

| Strapi Version  | Recommended | Minimum |
| --------------- | ----------- | ------- |
| 5.31.0 and up   | 24.x        | 20.x    |
| 5.0.0 to 5.30.1 | 20.x        | 18.x    |
| 4.14.5 and up   | 20.x        | 18.x    |
| 4.11.0 and up   | 18.x        | 16.x    |
| 4.3.9 to 4.10.x | 18.x        | 14.x    |
| 4.0.x to 4.3.8  | 16.x        | 14.x    |

**Database:**

| Database   | Recommended | Minimum |
| ---------- | ----------- | ------- |
| MySQL      | 8.0         | 8.0     |
| MariaDB    | 11.2        | 10.3    |
| PostgreSQL | 16.0        | 14.0    |
| SQLite     | 3           | 3       |

**We recommend always using the latest version of Strapi stable to start your new projects**.

## Features

- **Content Types Builder**: Build the most flexible publishing experience for your content managers, by giving them the freedom to create any page on the go with [fields](https://docs.strapi.io/user-docs/content-manager/writing-content#filling-up-fields), components and [Dynamic Zones](https://docs.strapi.io/user-docs/content-manager/writing-content#dynamic-zones).
- **Media Library**: Upload your images, videos, audio or documents to the media library. Easily find the right asset, edit and reuse it.
- **Internationalization**: The Internationalization (i18n) plugin allows Strapi users to create, manage and distribute localized content in different languages, called "locales"
- **Role Based Access Control**: Create an unlimited number of custom roles and permissions for admin and end users.
- **GraphQL or REST**: Consume the API using REST or GraphQL

You can unlock additional features such as SSO, Audit Logs, Review Workflows in [Strapi Cloud](https://cloud.strapi.io/login?source=github1) or [Strapi Enterprise](https://strapi.io/enterprise?source=github1).

**[See more on our website](https://strapi.io/overview)**.

## Contributing

Please read our [Contributing Guide](./CONTRIBUTING.md) before submitting a Pull Request to the project.

## Community support

For general help using Strapi, please refer to [the official Strapi documentation](https://docs.strapi.io). For additional help, you can use one of these channels to ask a question:

- [Discord](https://discord.strapi.io) (For live discussion with the Community and Strapi team)
- [GitHub](https://github.com/strapi/strapi) (Bug reports, Contributions)
- [Community Forum](https://forum.strapi.io) (Questions and Discussions)
- [Feedback section](https://feedback.strapi.io) (Roadmap, Feature requests)
- [Twitter](https://twitter.com/strapijs) (Get the news fast)
- [Facebook](https://www.facebook.com/Strapi-616063331867161)
- [YouTube Channel](https://www.youtube.com/strapi) (Learn from Video Tutorials)

## Migration

Follow our [migration guides](https://docs.strapi.io/developer-docs/latest/update-migration-guides/migration-guides.html) on the documentation to keep your projects up-to-date.

## Roadmap

Check out our [roadmap](https://feedback.strapi.io) to get informed of the latest features released and the upcoming ones. You may also give us insights and vote for a specific feature.

## Documentation

See our dedicated [repository](https://github.com/strapi/documentation) for the Strapi documentation, or view our documentation live:

- [Developer docs](https://docs.strapi.io/developer-docs/latest/getting-started/introduction.html)
- [User guide](https://docs.strapi.io/user-docs/latest/getting-started/introduction.html)
- [Cloud guide](https://docs.strapi.io/cloud/intro)

## Try live demo

See for yourself what's under the hood by getting access to a [hosted Strapi project](https://strapi.io/demo) with sample data.

## License

See the [LICENSE](./LICENSE) file for licensing information.



# Task 1 – Strapi Setup

## Objective
To clone the Strapi repository, run it locally, explore the project structure, start the admin panel, create a sample content type, and raise a pull request.


## Steps Performed

### 1. Clone the Strapi Repository
Cloned the official Strapi repository from GitHub using HTTPS:

```bash
git clone https://github.com/strapi/strapi.git

2. Navigate to Project Directory

Moved into the cloned Strapi project directory:

cd strapi

3. Check Git Installation

Verified Git installation:

git --version


4. Create a New Branch

Created a separate branch for Task 1 work to keep changes isolated from the main code:

git checkout -b task1_strapi

Later, the branch was renamed as per instructions to include my name:

git branch -m task1_strapi prashanth_task1

5. Install Node.js

Installed Node.js on the system and verified the installation:

node -v


Node.js version installed:

v24.13.0


6. Install Project Dependencies

Installed all required dependencies for the Strapi project using npm:

npm install


(The installation took some time as the project has multiple packages.)


7. Run Strapi Locally

Started the Strapi development server:

npm run develop

8. Access the Admin Panel

Opened the Strapi Admin Panel in the browser using:

http://localhost:1337/admin

9. Explore Project Folder Structure

Explored the Strapi project structure, including key folders such as:

packages/

apps/

config/

database/

This helped in understanding how the Strapi monorepo is organized.

10. Create a Sample Content Type

Using the Strapi Admin Panel:

Created a sample content type

Added basic fields

Saved and verified the content type


11. Fork Repository and Push Changes

Forked the Strapi repository to my personal GitHub account and pushed the branch:

git push origin prashanth_task1


12. Create a Pull Request

Created a Pull Request from my branch to the base branch as instructed.


GitHub Details

GitHub Username: prashanthbandari123

Branch Name: prashanth_task1

