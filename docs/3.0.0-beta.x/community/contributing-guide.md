# Open Development & Community Driven

Strapi is an open-source project administered by [the Strapi team](https://strapi.io/company). We appreciate your interest and efforts in contributing to Strapi.

There are many ways that you can contribute to Strapi. Contributions to Strapi and the greater Strapi Community can take the form of answering questions in one of the [many Strapi channels](/3.0.0-beta.x/community/contributing-guide.html#get-in-touch), writing articles, creating videos and otherwise publishing self-generated content.

The two additional ways to contribute to Strapi include contributing **Documentation** and **Code**:

- [Contribute in the form of Code Contributions](/3.0.0-beta.x/community/contribute-with-code.md)
- [Contribute in the form of Documentation, Tutorials, or Articles](/3.0.0-beta.x/community/contribute-with-docs.md).

Some people choose to support Strapi by [purchasing Swag from our Store](https://strapi.io/shop), (and then proudly wearing it!).

All contributions are highly appreciated and welcomed.

## Open-Source & MIT Licensed

Strapi is open-source under the [MIT license](https://github.com/strapi/strapi/blob/master/LICENSE.md). All work done is available on [GitHub](https://github.com/strapi/strapi).

The core team, as well as any contributors, send pull requests which go through the same validation process.

## Code of Conduct

The [Code of Conduct](/3.0.0-beta.x/community/code-of-conduct.md) governs this project and everyone participating in it. By participating, you are expected to uphold this code. Please read the [full text](/3.0.0-beta.x/community/code-of-conduct.md) so that you can read which actions may or may not be tolerated.

## Feature Requests

Feature Requests by the community are highly encouraged. Please feel free to submit a [feature request](https://portal.productboard.com/strapi) or upvote 👍 [an existing feature request](https://portal.productboard.com/strapi) in the ProductBoard.

## Bugs

We are using [GitHub Issues](https://github.com/strapi/strapi/issues) to manage our public bugs. We keep a close eye on this so before filing a new issue, try to make sure the problem does not already exist.

## Get in Touch

The Strapi Project continues to grow significantly, and different channels exist to help and inform users. Each Channel exists to serve its community. Strapi Community Members are welcome to join and participate in all (or a few) of these channels.

- [Slack](https://slack.strapi.io/)
- [Spectrum](https://spectrum.chat/strapi?tab=posts)
- [YouTube](https://www.youtube.com/strapi)
- [Reddit](https://www.reddit.com/r/Strapi/)
- [Twitter](https://twitter.com/strapijs)
- [Official Blog](https://blog.strapi.io/)
- [Stackoverflow](https://stackoverflow.com/questions/tagged/strapi)
- [Email](mailto:hi@strapi.io)

---

## Miscellaneous

### Repository Organization

We chose to use a monorepo design that exploits [Yarn Workspaces](https://yarnpkg.com/en/docs/workspaces) in the way [React](https://github.com/facebook/react/tree/master/packages) or [Babel](https://github.com/babel/babel/tree/master/packages) does. A monorepo allows the community to maintain the whole ecosystem easily, keep it up-to-date and consistent.

We do our best to keep the master branch as clean as possible, with tests passing at all times. However, the master branch may move faster than the release cycle. Therefore, check the [releases on npm](https://www.npmjs.com/package/strapi) so that you're always up-to-date with the latest stable version.

### Reporting an issue

Before submitting an issue, you need to make sure:

- You are experiencing a real technical issue with Strapi.
- You have already searched for related [issues](https://github.com/strapi/strapi/issues), and found none open (if you found a related _closed_ issue, please link to it from your post).
- You are not asking a question about how to use Strapi or about whether or not Strapi has a particular feature. For general help using Strapi, you may:
  - Refer to [the official Strapi documentation](http://strapi.io).
  - Ask a member of the community in the [Strapi Slack Community](https://slack.strapi.io/).
  - Ask a question on [Stackoverflow](http://stackoverflow.com/questions/tagged/strapi).
- Your issue title is concise, on-topic, and polite.
- You can and do provide steps to reproduce your issue.
- You have tried all the following (if relevant), and your issue remains:
  - Make sure you have the right application started.
  - Make sure you've killed the Strapi server with CTRL+C and started it again.
  - Make sure the application you are using to reproduce the issue has a clean `node_modules` directory, meaning:
    - no dependencies are linked (e.g., you haven't run `npm link`)
    - that you haven't made any inline changes to files in the `node_modules` folder
    - that you don't have any weird global dependency loops. The easiest way to double-check any of the above, if you aren't sure, is to run: `$ rm -rf node_modules && npm cache clear && npm install`.
