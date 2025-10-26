# Contributing to Strapi Audit Logs Plugin

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/[your-username]/strapi-plugin-audit-logs.git
cd strapi-plugin-audit-logs
```

2. Install dependencies:
```bash
yarn install
```

3. Link the plugin to your Strapi project:
```bash
yarn link
cd /path/to/your-strapi-project
yarn link @strapi/plugin-audit-logs
```

4. Build the plugin:
```bash
yarn build
```

## Running Tests

```bash
# Run unit tests
yarn test

# Run e2e tests
yarn test:e2e

# Run specific test file
yarn test [test-file-path]
```

## Code Style

- Follow the existing code style
- Use TypeScript for new files
- Add JSDoc comments for public APIs
- Keep files focused and modular

## Pull Request Process

1. Create a feature branch
2. Update documentation if needed
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit PR with clear description

## Commit Messages

Follow conventional commits format:
```
feat: add new filtering option
fix: resolve race condition in diff computation
docs: update API documentation
test: add test for bulk operations
```