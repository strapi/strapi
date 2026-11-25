# strapi-utils

[![npm version](https://img.shields.io/npm/v/@strapi/utils.svg)](https://www.npmjs.org/package/@strapi/utils)
[![npm downloads](https://img.shields.io/npm/dm/@strapi/utils.svg)](https://www.npmjs.org/package/@strapi/utils)

Shared utilities between Strapi packages.

## Subpath entries

`@strapi/utils/blocks-link` is a browser-safe entry, used by the admin, that avoids loading the Node-only root. It resolves through `blocks-link/package.json` because this package has no `exports` field. If an `exports` field is ever added, declare `./blocks-link` in it too, or the import will stop resolving.

## Resources

- [License](LICENSE)

## Links

- [Strapi website](https://strapi.io/)
- [Strapi community on Slack](https://slack.strapi.io)
- [Strapi news on Twitter](https://twitter.com/strapijs)
