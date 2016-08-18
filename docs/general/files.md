# Configuration: A Glossary

A guide to the configuration files for this project: where they live and what
they do.

## The root folder

* `.editorconfig`: Sets the default configuration for certain files across editors. (e.g. indentation)

* `.gitattributes`: Normalizes how `git`, the version control system this boilerplate uses, handles certain files.

* `.gitignore`: Tells `git` to ignore certain files and folders which don't need to be version controlled, like the build folder.

* `.travis.yml` and `appveyor.yml`: Continuous Integration configuration<br/>
  This boilerplate uses [Travis CI](https://travis-ci.com) for Linux environments
  and [AppVeyor](https://www.appveyor.com/) for Windows platforms, but feel free
  to swap either out for your own choice of CI.

* `package.json`: Our `npm` configuration file has three functions:

  1. It's where Babel, ESLint and stylelint are configured
  1. It's the API for the project: a consistent interface for all its controls
  1. It lists the project's package dependencies

  Baking the config in is a slightly unusual set-up, but it allows us to keep
  the project root as uncluttered and grokkable-at-a-glance as possible.

## The `./internals` folder

This is where the bulk of the tooling configuration lives, broken out into
recognisable units of work.

Feel free to change anything you like but don't be afraid to [ask upfront](https://gitter.im/mxstbr/react-boilerplate)
whether you should: build systems are easy to break!
