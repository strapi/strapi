---
title: Build
tags:
  - CLI
  - commands
  - admin
  - build
---

The `build` command is used to build the strapi admin panel as a SPA ready to be served by the strapi server.

## Usage

```bash
strapi build
```

### Options

```bash
Build the strapi admin app

Options:
  -d, --debug        Enable debugging mode with verbose logs (default: false)
  --minify           Minify the output (default: true)
  --no-optimization  [deprecated]: use minify instead
  --silent           Don't log anything (default: false)
  --sourcemap        Produce sourcemaps (default: false)
  --stats            Print build statistics to the console (default: false)
  -h, --help         Display help for command
```

## How it works

The build process for the admin panel is designed to be bundler agnostic, this means we can easily experiment and perhaps transition to new bundlers as they become available in the ecosystem. This is facilitated by the use of a [`BuildContext`](#buildcontext) that contains all the information needed to build the admin panel – if it's found more information is required this context can be tweaked to provide it.

### Dependencies

The first step of running the build command is to check if the required dependencies are installed at the root of the project. This provides better DX for:

- miss-installed project
- monorepos
- incorrect/incompatible versions of packages for _certain_ packages like `styled-components` or `react`.

The list of packages we explicity check for are:

- `react`
- `react-dom`
- `styled-components`
- `react-router-dom`

This is because there should only be one instance of these packages installed and used by the project at any one time, failure to do so can and most likely will, lead to bugs. This also means an incompatible version of these packages could cause unintended side effects e.g. if `react@19` was suddenly released but we had not tested it against the admin panel.

We run a prompt to encourage the user to install these deps – however, this functionality has not yet been built.

### BuildContext

The build context is the heart of how the admin builds, as said above it's agnostic, it doesn't care if we're using webpack or vite or parcel. It's an object of data that can be used to preapre any bundler. It's shape looks like:

```ts
interface BuildContext {
  /**
   * The absolute path to the app directory defined by the Strapi instance
   */
  appDir: string;
  /**
   * If a user is deploying the project under a nested public path, we use
   * this path so all asset paths will be rewritten accordingly
   */
  basePath: string;
  /**
   * The customisations defined by the user in their app.js file
   */
  customisations?: AppFile;
  /**
   * The current working directory
   */
  cwd: string;
  /**
   * The absolute path to the dist directory
   */
  distPath: string;
  /**
   * The relative path to the dist directory
   */
  distDir: string;
  /**
   * The absolute path to the entry file
   */
  entry: string;
  /**
   * The environment variables to be included in the JS bundle
   */
  env: Record<string, string>;
  logger: CLIContext['logger'];
  /**
   * The build options
   */
  options: Pick<BuildOptions, 'minify' | 'sourcemaps' | 'stats'> & Pick<DevelopOptions, 'open'>;
  /**
   * The plugins to be included in the JS bundle
   * incl. internal plugins, third party plugins & local plugins
   */
  plugins: Array<{
    path: string;
    name: string;
    importName: string;
  }>;
  /**
   * The absolute path to the runtime directory
   */
  runtimeDir: string;
  /**
   * The Strapi instance
   */
  strapi: Strapi;
  /**
   * The browserslist target either loaded from the user's workspace or falling back to the default
   */
  target: string[];
  tsconfig?: CLIContext['tsconfig'];
}
```

### Static Files

The next step is to create a `runtime` folder in the root of the strapi project, a generic name `.strapi` is used and the build specifically uses a subfolder called `client`. This leaves more space for us to expand as and when we require it. We only generate two files for this – an `index.html` which is a static rendered React Component from the `@strapi/admin` package (DefaultDocument) & an `entry.js` file which calls the `renderAdmin` function & provides a mount point & plugin object.

### Bundling

We currently support both `webpack` & `vite` bundlers, with `vite` being the default. Because there is no global `strapi.config` file we don't have an already existing API to pass your own bundler. In the future we may decide to do this if there is a need. Each bundler supplies a build function & a develop function. We don't need a serve function because they're expected to produce the same `index.html` output defined by the static files step described above.

## Node Usage

```ts
import { build, BuildOptions } from '@strapi/admin/_internal';

const args: BuildOptions = {
  // ...
};

await build(args);
```

### Options

```ts
interface BuildOptions extends CLIContext {
  /**
   * The directory to build the command was ran from
   */
  cwd: string;
  /**
   * The logger to use.
   */
  logger: Logger;
  /**
   * Minify the output
   *
   * @default true
   */
  minify?: boolean;
  /**
   * Generate sourcemaps – useful for debugging bugs in the admin panel UI.
   */
  sourcemaps?: boolean;
  /**
   * Print stats for build
   */
  stats?: boolean;
  /**
   * The tsconfig to use for the build. If undefined, this is not a TS project.
   */
  tsconfig?: TsConfig;
}

interface Logger {
  warnings: number;
  errors: number;
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  log: (...args: unknown[]) => void;
  spinner: (text: string) => Pick<ora.Ora, 'succeed' | 'fail' | 'start' | 'text'>;
}

interface TsConfig {
  config: ts.ParsedCommandLine;
  path: string;
}
```
