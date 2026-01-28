# Issue template checker

This action validates that newly opened issues follow the required issue template format.

> ❗️ When making changes to this code, make sure to run the build before committing. See [Development](#development) to know more.

## Conditions

The action checks that issues include:

1. **Required checkboxes:**

- User has checked the existing issues for duplicates
- User agrees to follow the project's Code of Conduct

2. **Required version fields with valid content:**

- Node Version
- NPM/Yarn/PNPM Version
- Strapi Version

If any required items are missing or contain placeholder text (`No response`, `N/A`, `None`), the action will:

- Add the `flag: invalid template` label to the issue

The issue will subsequently be commented on and closed by the `issues_handleLabel.yml` workflow.

## Contributing

### Requirements

- The code is compatible with Node 18, 20, and 22

### Dependencies

- Run `yarn` to install the dependencies

### Development

In order for the action to run on github all the code needs to be bundled and committed because github actions do not manage dependencies for us. [Github reference documentation](https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action#commit-tag-and-push-your-action-to-github).

### Commands

- `yarn build`: Build the code the must be committed
- `yarn watch`: Build in watch mode
