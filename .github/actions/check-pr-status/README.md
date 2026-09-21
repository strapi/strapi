# PR checker for status

This action checks a PR labels and status to check that it is ready for merging.

> ❗️ Run the build after you change this code. See [Development](#development) for more information.

## Conditions

1. The PR must not have the following labels:

- `flag: 💥 Breaking change`
- `flag: don't merge`

2. The PR must have one and only one `source: *` label.
3. The PR must have one and only one `pr: *` label.
4. Community PRs must not target `main`.

## Contributing

### Requirements

- The code is compatible with Node 22, 24, and 26

### Dependencies

- Run `yarn` to install the dependencies

### Development

GitHub Actions does not manage dependencies for us. For this reason, the action needs all the code bundled and committed before it can run on GitHub. See the [GitHub reference documentation](https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action#commit-tag-and-push-your-action-to-github).

### Commands

- `yarn build`: Build the code the must be committed
- `yarn watch`: Build in watch mode
