# Test Infrastructure

This directory contains the shared test infrastructure for Strapi's test suites.

## Structure

```
tests/
├── shared-utils/           # Shared utilities used by all test types
│   ├── index.js           # Main export file
│   ├── fs.js              # File system utilities
│   ├── helpers.js         # Common test helpers
│   └── constants.js       # Shared constants
├── scripts/               # Test runner scripts
│   ├── shared-test-runner.js  # Shared test runner infrastructure
│   ├── runners/           # Test type specific runners
│   │   ├── e2e-runner.js  # Playwright-based e2e runner
│   │   └── cli-runner.js  # Jest-based CLI runner
│   ├── run-e2e-tests.js   # E2E test entry point
│   └── run-cli-tests.js   # CLI test entry point
├── e2e/                   # E2E test specific files
│   ├── utils/             # E2E specific utilities
│   ├── tests/             # E2E test files
│   └── app-template/      # E2E test app template
├── cli/                   # CLI test specific files
│   ├── utils/             # CLI specific utilities
│   ├── tests/             # CLI test files
│   └── app-template/      # CLI test app template
└── helpers/               # Shared test helpers
    └── test-app.js        # Test app generation utilities
```

## Shared Infrastructure

The test infrastructure has been refactored to share common functionality between different test types (e2e, cli) while keeping test-specific logic separate.

### SharedTestRunner

The `SharedTestRunner` class provides common functionality:

- Test app setup and cleanup
- Environment configuration
- Package publishing
- Command line argument parsing
- Test execution orchestration

### Test Runners

Each test type has its own runner that implements the specific test execution logic:

- **E2ERunner**: Handles Playwright-based e2e tests
- **CLIRunner**: Handles Jest-based CLI tests

### Shared Utilities

Common utilities are available in `shared-utils/`:

- File system operations
- Process execution helpers
- Server health checking
- Port management
- Temporary directory creation

## Usage

### Running Tests

```bash
# Run e2e tests
yarn test:e2e

# Run CLI tests
yarn test:cli

# Clean test apps
yarn test:e2e:clean
yarn test:cli:clean
```

### Adding New Test Types

To add a new test type:

1. Create a new runner in `scripts/runners/`
2. Create a new test script in `scripts/`
3. Create test-specific utilities in a new directory under `tests/`
4. Update package.json scripts

### Extending Shared Utilities

Add new shared utilities to `tests/shared-utils/` and export them from `index.js`.

## Migration Notes

The original test scripts have been backed up as `.backup` files. The new structure maintains the same external API while sharing common functionality internally.

Key changes:

- Common setup logic is now shared
- Test-specific runners handle execution differences
- Shared utilities reduce code duplication
- Better separation of concerns
