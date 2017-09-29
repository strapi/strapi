# Contributing

Strapi has an active and growing open-source community.
All work on the open-source framework occurs in the GitHub organization.

## Governance

The Strapi project governance model follows the spirit and tradition of open-source
by embracing consensus, forking, and individual ownership.

### Principles

Strapi is an open, inclusive, and tolerant community of people working together
to build a world-class Node.js framework and tools. We value diversity of individuals and
opinions, and seek to operate on consensus whenever possible.
We strive to maintain a welcoming, inclusive, and harassment-free environment,
regardless of the form of communication. When consensus is not achievable, we defer
to the owners of each individual module; the powers of the individual owner are kept
in check by the ability of the community to fork and replace dependencies on the
individual module and maintainer.

### Maintainers

Each repository has one or more lead maintainers responsible for:
- Daily operations: approving pull requests, responding to new issues,
  guiding discussions, and so on.
- Seeking consensus on technical decisions.
- Making the final decisions when consensus cannot be achieved.

Wistity maintainers have npm publishing rights for modules and Wistity has the
final say on releasing new versions.

### Strapi lead maintainers

Strapi lead maintainers include Wistity employees and welcome other active
community members:
- Aurélien Georget ([@aurelsicoko](https://github.com/aurelsicoko)) (Wistity)
- Jim Laurie ([@lauriejim](https://github.com/lauriejim)) (Wistity)
- Pierre Burgy ([@pierreburgy](https://github.com/pierreburgy)) (Wistity)

## Contributing

There are many ways you can contribute to the Strapi project.
All contributions are welcome!

### Submitting a pull request

1. Create a GitHub issue for large changes and discuss the change there before coding.
  You can skip this step and submit the pull request for minor changes.
2. Fork the repository on GitHub.
3. Create a branch for you change/feature off of the master branch.
4. Make your change. Remember to update tests as well as code! Always run all the tests
  to assure nothing else was accidentally broken. For bugs, adding a failing test and
  submitting a pull request usually leads to the bug being fixed quickly.
  For features, include tests that cover the entire feature.
5. Check for unnecessary whitespace with `git diff --check` before committing.
6. Make commits of logical units and push them to Github.
7. Use a descriptive commit message, and follow
  [50/72 format](http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html).
8. Use GitHub's pull requests to submit the patch. Feel free to issue the pull
  request as soon as you have something partial to show and get reviewed.
  You can add more commits to your pull request as you are progressing on the implementation.
  The title of the pull request should start with "WIP" for "work in progress"
  when the pull request is not complete yet.
9. Request a code review. Add a specific committer to speed up this process
  (for example, `@aurelsicoko`).
10. Make any requested changes and push to your fork. Make sure your changes are still based
  on the latest code (use `git rebase upstream/master`).

### Reporting issues

Follow this basic process:
- Search existing issues. It's possible someone has already reported the same problem.
- Make sure you have a GitHub account.
- Create a new issue for the bug. Clearly describe the issue, including steps to reproduce.
  Make sure you fill in the earliest version that you know has the issue.
