# Changelog

## RBP v3: The "JS Fatigue Antivenin" Edition

React Boilerplate (RBP) v3.0.0 is out, and it's a _complete_ rewrite! :tada:

We've focused on becoming a rock-solid foundation to start your next project
with, no matter what its scale. You get to focus on writing your app because we
focus on making that as easy as pie.

website!

## Highlights

- **Scaffolding**: Thanks to @somus, you can now run `npm run generate` in your
  terminal and immediately create new components, containers, sagas, routes and
  selectors! No more context switching, no more "Create new file, copy and paste
  that boilerplate structure, bla bla": just `npm run generate <thing>` and go.

  Oh... and starting a project got a whole lot easier too: `npm run setup`. Done.

- **Revamped architecture**: Following the incredible discussion in #27 (thanks
  everybody for sharing your thoughts), we now have a weapons-grade, domain-driven
  application architecture.

  "Smart" containers are now isolated from stateless and/or generic components,
  tests are now co-located with the code that they validate.

- **New industry-standard JS utilties** We're now making the most of...
    - ImmutableJS
    - reselect
    - react-router-redux
    - redux-saga

- **Huge CSS Improvements**
  - _[CSS Modules](docs/css/css-modules.md)_: Finally, truly modular, reusable
    styles!
  - _Page-specific CSS_: smart Webpack configuration means that only the CSS
    your components need is served
  - _Standards rock:_ Nothing beats consistent styling so we beefed up the
    quality checks with **[stylelint](docs/css/stylelint.md)** to help ensure
    that you and your team stay on point.

- **Performance**
  - _Code splitting_: splitting/chunking by route means the leanest, meanest
    payload (because the fastest code is the code you don't load!)
  - _PageSpeed Metrics_ are built right in with `npm run pagespeed`

- **Testing setup**: Thanks to @jbinto's herculean efforts, testing is now a
  first-class citizen of this boilerplate. (the example app has _99% test coverage!_)
  Karma and enzyme take care of unit testing, while ngrok tunnels your local
  server for access from anywhere in the world – perfect for testing on different
  devices in different locations.

- **New server setup**: Thanks to the mighty @grabbou, we now use express.js to
  give users a production-ready server right out of the box. Hot reloading is
  still as available as always, but adding a custom API or a non-React page to
  your application is now easier than ever :smile:

- **Cleaner layout:** We've taken no prisoners with our approach to keeping your
  code the star of the show: wherever possible, the new file layout keeps the
  config in the background so that you can keep your focus where it needs to be.

- **Documentation**: Thanks to @oliverturner, this boilerplate has some of the best
  documentation going. Not just clearly explained usage guides, but easy-to-follow
  _removal_ guides for most features too. RBP is just a launchpad: don't want to
  use a bundled feature? Get rid of it quickly and easily without having to dig
  through the code.

- **Countless small improvements**: Everything, from linting pre-commit (thanks
  @okonet!) to code splitting to cross-OS compatibility is now tested and ready
  to go:

  - We finally added a **[CoC](CODE_OF_CONDUCT.md)**
  - Windows compatibility has improved massively
