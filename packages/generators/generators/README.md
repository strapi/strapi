# @strapi/generators

This package contains strapi code generators available through the CLI or programmatically.

## API Reference

### `runCLI()`

Start the generator CLI.

### `generate(generatorName, options, plopOptions)`

Execute a generator without interactive mode.

- `generatorName` - one of `api`, `controller`, `service`, `model`, `plugin`, `policy`.
- `options` - options are specific to each generator
- `plopOptions`
  - `dir`: base directory that plop will use as base directory for its actions
