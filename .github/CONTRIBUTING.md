# Contributing

Strapi is an open-source project administered by [the Strapi team](http://strapi.io).

We welcome and encourage everyone who want to help us on Strapi.

Before contributing, ensure that your effort is aligned with the project's roadmap by talking to the maintainers, especially if you are going to spend a lot of time on it. Feel free to [join us on Slack](http://slack.strapi.io) if you are interested in helping us or [drop us an email](mailto:hi@strapi.io) if you are interested in working with us.

## Maintainers

- Aurélien Georget ([@aurelsicoko](https://github.com/aurelsicoko)) (Strapi)
- Jim Laurie ([@lauriejim](https://github.com/lauriejim)) (Strapi)
- Pierre Burgy ([@pierreburgy](https://github.com/pierreburgy)) (Strapi)

The Strapi team have npm publishing rights for modules and also has the final say on releasing new versions.

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

## Code of Conduct

[The Strapi team](http://strapi.io) is committed to fostering a welcoming community for Strapi. If you encounter any unacceptable behavior, follow these steps to report the issue to the team. We are here to help.

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
