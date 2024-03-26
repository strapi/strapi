# PR checker for status

This action checks a PR labels, milestone and status to validate it is ready for merging into main.

> ❗️ When making changes to this code, make sure to run the build before committing. See [Development](#development) to know more.

## Conditions

1. The PR should not have the following labels:

- `flag: 💥 Breaking change`
- `flag: don't merge`

2. The PR should have one and only one `source: *` label.
3. The PR should have one and only one `issue-type: *` label.
4. The PR must have a milestone defined.

## Contributing

### Requirements

- The code is compatible with Node 18, and 20

### Dependencies

- Run `yarn` to install the dependencies

### Development

In order for the action to run on github all the code needs to be bundled and committed because github actions do not manage dependencies for us. [Github reference documentation](https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action#commit-tag-and-push-your-action-to-github).

### Commands

- `yarn build`: Build the code the must be committed
- `yarn watch`: Build in watch mode
