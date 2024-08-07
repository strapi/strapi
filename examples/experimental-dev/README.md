# Experimental Dev

This app is used to run experimental dependencies in Strapi. Specifically right now, used to test react19 release candidates & the react-compiler

## Getting started

To run the example you should include `USE_EXPERIMENTAL_DEPENDENCIES=true` in your `.env` file. This flag is used by the `@strapi/strapi` cli package and disabled checking against the dependency versions in your project as for production applications we only officially support v17/18 of react.

## Using the compiler

The compiler is extremely experimental. To activate it, you need to add `USE_REACT_COMPILER=true` to your `.env` file. Compilation _may_ be slower because it's only a babel plugin, so instead of using `@vitejs/plugin-react-swc` we're using `@vitejs/plugin-react` which arguably may be slower.
