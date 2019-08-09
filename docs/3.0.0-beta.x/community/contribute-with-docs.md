# Contribute with Docs

All efforts to contribute to the [Docs](https://strapi.io/documentation/3.0.0-beta.x/) are highly appreciated, we recommend you talk to a maintainer before spending much time making a pull request that may not align with the project roadmap. You are welcome to create tutorials, articles, and videos for your blog or channels without speaking to a maintainer.

## General Guidelines

Please review the following guidelines and recommendations regarding contributing with Docs to the Strapi project.

## Types of Documentation

Four different **types of content** exist in the documentation:

- Tutorials
- How-to's
- Reference Topics
- Explanations

Below are explanations for each category of content. The overall key is to know who is your audience and then writing for that audience.

### Tutorials

A **Tutorial** is a complete set of instructions that take the reader through to the completion of a specific end, such as a project or complete working application. The purpose of tutorials is to **teach** concepts and show how to accomplish specific actions using Strapi generally.

Examples include the [Building a Static Blog using Gatsby and Strapi](https://blog.strapi.io/building-a-static-website-using-gatsby-and-strapi/) tutorial and the [Cooking a Deliveroo Clone](https://blog.strapi.io/strapi-next-setup/) tutorial.

### How-to's

A **How-to** is a **step-by-step guide showing how** to solve a specific problem or accomplish a specific task. These guides provide concise action steps and assume a general understanding of the context by the audience.

Examples include the [Digital Ocean Deployment Guide](/3.0.0-beta.x/guides/deployment.html#digital-ocean) and [How to install MongoDB Locally](/3.0.0-beta.x/guides/databases.html#install-mongodb-locally).

### Reference topics

**Reference topics** are subjects that **are resources** to bookmark and used as a reference. Developers can be expected to refer to Reference topics in the docs regularly throughout the development of Strapi based projects.

Examples include the [Models Guide](/3.0.0-beta.x/guides/models.html#how-to-create-a-model) and the [Controllers Guide](/3.0.0-beta.x/guides/controllers.html).

### Explanations

**Explanations** cover why something was done and provide an understanding of the choices made through the course of the development of Strapi. These are generally written as **Articles** and found in the [Strapi Blog](https://blog.strapi.io).

Examples include [Why we split the management of the Admin user and the Front-end Users](https://blog.strapi.io/why-we-split-the-management-of-the-admin-users-and-end-users/) and [Restricting Permissions in Strapi Admin](https://blog.strapi.io/admin-permissions/).

These four categories roughly follow the recommendations found in this article about [documentation by Divio](https://www.divio.com/blog/documentation/). We recommend reading it for a complete understanding of each type.

## The Workflow

The Workflow includes:

- The [Technical Requirements and the Installation of the Docs](/3.0.0-beta.x/community/contribute-with-docs.html#technical-requirements) in your development environment.
- [Understanding the Docs Structure](/3.0.0-beta.x/community/contribute-with-docs.html#understanding-the-docs-structure)
- [Adding/modifying/deleting Content](/3.0.0-beta.x/community/contribute-with-docs.html#adding-modifying-deleting-content)
- How to [submit an externally hosted tutorial](/3.0.0-beta.x/community/contribute-with-docs.html#submitting-an-externally-hosted-tutorial).
- How to use the [Docs Style Guide](/3.0.0-beta.x/community/contribute-with-docs.html#docs-style-guide) to write better Docs.

### Technical Requirements

- You have [Node](https://nodejs.org/en/) at v10.x.x.
- You are familiar with Git, and have it installed on your development environment.

1. Ensure you're using the [required versions of Node.js and npm](/3.0.0-beta.x/getting-started/install-requirements.html).
2. Fork the [Strapi repository](https://github.com/strapi/strapi) [to your own GitHub account](https://help.github.com/en/articles/fork-a-repo).
3. Clone your Strapi repository:

`Path: ./Projects/`

```bash
git clone git@github.com:YOUR_USERNAME/strapi.git
```

4. Install the dependencies **for the docs** section of the monorepo:

`Path: ./Projects/`

```bash
cd strapi/docs
npm install
```

5. Start the docs development server and open the documentation in the browser:

```bash
npm run dev
```

Then, navigate to [http://localhost:8080/documentation/](http://localhost:8080/documentation/).

You should now have a running instance of the documentation. The next section explains the organization of the documentation.

### Understanding the Docs Structure

The Strapi docs are power by [VuePress](https://vuepress.vuejs.org/). The docs live in a folder called **docs**. `Path: ./strapi/docs`. The _VuePress_ installation lives in this folder. It has a separate installation and separate dependencies from the rest of the monorepo.

Only version **3.0.0-beta.x** is being maintained. So, therefore, only the documentation for this version is being maintained. The documentation is located at `./docs/3.0.0-beta.x/`. Here you find all the content and assets for the documentation.

The _folder names_ in the file directory correspond to the different sections in the left-hand menu. For example, the folder called, "Getting Started", corresponds to the section called, "Getting Started". However, the `h1` tag at the top of the files control the left-menu titles.

If you add a page or folder, you do it in the config file of the Beta docs. `Path: ./docs/.versions/3.0.0-beta.x.js/`

If you wanted to add a page under `Getting Started` and the file is called `example.md`, you would save the file in the folder called `/getting-started`. Next, you would modify the config file like the example below:

`Path: ./docs/.versions/3.0.0-beta.x.js/`

```js
module.exports = [
  {
    collapsable: false,
    title: '🚀 Getting started',
    children: [
      '/3.0.0-beta.x/getting-started/introduction',
      '/3.0.0-beta.x/getting-started/install-requirements',
      '/3.0.0-beta.x/getting-started/quick-start',
      '/3.0.0-beta.x/getting-started/quick-start-tutorial',
      '/3.0.0-beta.x/getting-started/example',  // <- Added here
    ],
  },

```

### Adding / Modifying / Deleting Content

### Submitting an Externally Hosted Tutorial

### Docs Style Guide

This style guide exists to show and explain the standards and style of how our documentation is written. We are offering this style guide to help you stay consistent with the existing documentation. More important, these suggestions and this guide have been found to help communicate complex topics effectively.
