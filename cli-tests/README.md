# CLI Tests

## Structure

Each subdirectory within the `./tests` directory here is considered a test "domain" and will have its own test app(s) available. By default only one test app is made available unless additional ones are configured in a config.js within that test domain.

### tests/{domain}/config.js

This optional file should return a function that returns an object like the following example:

```typescript
module.exports = () => {
  return {
    testApps: 2, // the number of test apps to be made available
  };
};
```
