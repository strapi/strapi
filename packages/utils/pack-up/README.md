<h1 align="center">pack-up</h1>
<h3 align="center">Your daily lunchbox of bundling tools</h3>

<br />

<p align="center">
  <a href="https://www.npmjs.com/package/@strapi/pack-up" target="_blank">
    <img src="https://img.shields.io/npm/v/@strapi/pack-up.svg?style=flat&colorA=4945ff&colorB=4945ff" />
  </a>
  <a href="https://www.npmjs.com/package/@strapi/pack-up" target="_blank">
    <img src="https://img.shields.io/npm/dm/@strapi/pack-up.svg?style=flat&colorA=4945ff&colorB=4945ff" />
  </a>
  <a href="https://discord.gg/strapi" target="_blank">
    <img src="https://img.shields.io/discord/811989166782021633?style=flat&colorA=4945ff&colorB=4945ff&label=discord&logo=discord&logoColor=f0f0ff" alt="Chat on Discord" />
  </a>
</p>

<br />

pack-up is a set of simple tools for creating interoperable CJS & ESM packages.

Setting up a new interoperable project is as easy as doing:

```sh
npx @strapi/pack-up@latest init my-package

cd my-package

npm run build
```

Just a small bit about us:

- **Vite**: We support `vite` as a JS bundler, no need to install it though as it's preprepared with helpful defaults ready to tackle all projects.
- **Concise**: It's all based off your `package.json` so you know the interoperable aspect is correctly set up and there's no requirement for another config!
- **Flexible**: Need more customisation or to bundle a package not declared in your exports? Use the config file to dictate separate bundles & options.

## Getting Started

If you're setting up a brand new package we recommend you use the `init` command to get started:

```sh
npx @strapi/pack-up@latest init my-package
```

But if you're adding this to an existing project then just install like every other dependency:

```sh
npm install @strapi/pack-up@latest --save-dev
```

And to help you ensure your package is set up correctly run the `check` command:

```sh
npm run pack-up check
```

Run `pack-up -h` for more information on CLI usage.

## Commands

### `init [path]`

Creates a new package at the given path, by default uses the inbuilt template sensible options for your package to choose from.

- `--template [path]` – path to a custom template of type `TemplateOrTemplateResolver`.

### `build`

Builds your current package based on the configuration in your `package.json` and `package.config.ts` (if applicable).

- `--minify` – minifies the output (default `false`).
- `--sourcemap` – generates sourcemaps for the output (default `true`).

### `check`

Checks your current package to ensure it's interoperable in the real world. In short, validates the files in your dist have been produced as we expect & then `esbuild` can actually build, using your exported code.

### `watch`

Watches your current package for changes and rebuilds when necessary.

## Configuration

`@strapi/pack-up` by default reads its configuration from your `package.json`. But sometimes you need more flexibility, to do this you can create a `package.config.ts` file in the root of your package.

```ts
// package.config.ts
import { defineConfig } from '@strapi/pack-up';

export default defineConfig({
  minify: true,
  sourcemap: false,
  externals: ['path', 'fs'],
});
```

### Options

#### `bundles`

- Type: `ConfigBundle[]`

An array of entry points to bundle. This is useful if you want to bundle something that should not
be exported by the package, e.g. CLI scripts or Node.js workers.

#### `dist`

- Type: `string`

The path to the directory to which the bundled files should be written.

#### `exports`

- Type: `Record<string, Export>`

Overwrite or amend the parsed exports from your `package.json`.

#### `externals`

- Type: `string[]`

An array of modules that should not be bundled but instead be resolved at runtime, this is by default the dependencies listed in your `package.json` (excluding devDeps).

#### `minify`

- Type: `boolean`

Whether to minify the output or not.

#### `plugins`

- Type: `PluginOption[] | (({ runtime }: { runtime: Runtime }) => PluginOption[]);`

An array of Vite plugins to use when bundling, or optionally a function that returns an array of plugins based on the runtime.

#### `preserveModules`

- Type: `boolean`

Instead of creating as few chunks as possible, this mode will create separate chunks for all modules using the original module names as file names.

#### `sourcemap`

- Type: `boolean`

Whether to generate sourcemaps for the output or not.

#### `runtime`

- Type: `Runtime`

The transpilation target of the bundle. This is useful if you're bundling many different CLIs or Node.js workers and you want them to be transpiled for the node environment.

#### `tsconfig`

- Type: `string`

Path to the tsconfig file to use for the bundle, defaults to `tsconfig.build.json`.
