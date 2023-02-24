---
title: How to install packages
slug: /how-to-install-packages
tags:
  - lerna
  - packages
---

# Best practices for installing packages in Strapi

When working with the Strapi monorepo, it's important to follow best practices for installing packages to avoid potential issues and ensure consistent results. Instead of using the standard **`yarn add`** command, we recommend using **`yarn lerna add <package_name> --scope @strapi/<module_name>`** for installing packages. Actually, you may encounter the following error using `yarn add`:

`An unexpected error occurred: "expected workspace package to exist for \"@typescript-eslint/typescript-estree\'`

This approach uses Lerna, a tool for managing JavaScript projects with multiple packages, to ensure that the package is installed in the correct location(s) and version across all modules that include it. The **`--scope`** flag specifies the specific module(s) that the package should be installed in, ensuring that it's only installed where it's needed.

By using this method, Strapi developers can avoid issues with mismatched package versions or unnecessary dependencies in certain modules. This can help to keep the codebase clean and maintainable, and reduce the potential for conflicts or issues in the future.

Overall, we recommend using **`yarn lerna add`** with the **`--scope`** flag for installing packages in the Strapi mono repo, to ensure consistent and reliable results.

## Resources

- [Lerna Docs](https://futurestud.io/tutorials/lerna-install-dependencies-for-a-specific-package)
