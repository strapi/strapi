'use strict';

jest.mock('@actions/github');
jest.mock('@actions/core');

const github = require('@actions/github');
const core = require('@actions/core');
const action = require('../index');

const mockOctokit = {
  rest: {
    issues: {
      addLabels: jest.fn(),
    },
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  github.getOctokit = jest.fn(() => mockOctokit);
  process.env.GITHUB_TOKEN = 'test-token';
});

describe('Valid issues', () => {
  test('Should not take action when all required items are present', async () => {
    github.context = {
      payload: {
        issue: {
          number: 123,
          user: { login: 'testuser' },
          body: `
- [x] I have checked the existing [issues](https://github.com/strapi/strapi/issues) for duplicates.
- [x] I agree to follow this project's [Code of Conduct](https://github.com/strapi/strapi/blob/main/CODE_OF_CONDUCT.md).

### Node Version

v20.0.0

### NPM/Yarn/PNPM Version

npm 10.0.0

### Strapi Version

5.0.0

### Other Info
`,
        },
      },
      repo: { owner: 'strapi', repo: 'strapi' },
    };

    await action();

    expect(mockOctokit.rest.issues.addLabels).not.toHaveBeenCalled();
  });
});

describe('Missing checkboxes', () => {
  test('Should flag issue when duplicate check is missing', async () => {
    github.context = {
      payload: {
        issue: {
          number: 123,
          user: { login: 'testuser' },
          body: `
- [ ] I have checked the existing [issues](https://github.com/strapi/strapi/issues) for duplicates.
- [x] I agree to follow this project's [Code of Conduct](https://github.com/strapi/strapi/blob/main/CODE_OF_CONDUCT.md).

### Node Version

v20.0.0

### NPM/Yarn/PNPM Version

npm 10.0.0

### Strapi Version

5.0.0

### Other Info
`,
        },
      },
      repo: { owner: 'strapi', repo: 'strapi' },
    };

    await action();

    expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith({
      owner: 'strapi',
      repo: 'strapi',
      issue_number: 123,
      labels: ['flag: invalid template'],
    });
  });

  test('Should flag issue when code of conduct is missing', async () => {
    github.context = {
      payload: {
        issue: {
          number: 456,
          user: { login: 'testuser' },
          body: `
- [x] I have checked the existing [issues](https://github.com/strapi/strapi/issues) for duplicates.
- [ ] I agree to follow this project's [Code of Conduct](https://github.com/strapi/strapi/blob/main/CODE_OF_CONDUCT.md).

### Node Version

v20.0.0

### NPM/Yarn/PNPM Version

npm 10.0.0

### Strapi Version

5.0.0

### Other Info
`,
        },
      },
      repo: { owner: 'strapi', repo: 'strapi' },
    };

    await action();

    expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalled();
  });
});

describe('Missing version fields', () => {
  test('Should flag issue when Node Version is missing', async () => {
    github.context = {
      payload: {
        issue: {
          number: 789,
          user: { login: 'testuser' },
          body: `
- [x] I have checked the existing [issues](https://github.com/strapi/strapi/issues) for duplicates.
- [x] I agree to follow this project's [Code of Conduct](https://github.com/strapi/strapi/blob/main/CODE_OF_CONDUCT.md).

### NPM/Yarn/PNPM Version
npm 10.0.0

### Strapi Version
5.0.0
`,
        },
      },
      repo: { owner: 'strapi', repo: 'strapi' },
    };

    await action();

    expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalled();
  });

  test('Should flag issue when version fields have placeholder text', async () => {
    github.context = {
      payload: {
        issue: {
          number: 101,
          user: { login: 'testuser' },
          body: `
- [x] I have checked the existing [issues](https://github.com/strapi/strapi/issues) for duplicates.
- [x] I agree to follow this project's [Code of Conduct](https://github.com/strapi/strapi/blob/main/CODE_OF_CONDUCT.md).

### Node Version
No response

### NPM/Yarn/PNPM Version
N/A

### Strapi Version
None
`,
        },
      },
      repo: { owner: 'strapi', repo: 'strapi' },
    };

    await action();

    expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalled();
  });

  test('Should flag issue when version fields are too short', async () => {
    github.context = {
      payload: {
        issue: {
          number: 102,
          user: { login: 'testuser' },
          body: `
- [x] I have checked the existing [issues](https://github.com/strapi/strapi/issues) for duplicates.
- [x] I agree to follow this project's [Code of Conduct](https://github.com/strapi/strapi/blob/main/CODE_OF_CONDUCT.md).

### Node Version
v

### NPM/Yarn/PNPM Version
10

### Strapi Version
5.0.0
`,
        },
      },
      repo: { owner: 'strapi', repo: 'strapi' },
    };

    await action();

    expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalled();
  });
});

describe('Checkbox pattern variations', () => {
  test('Should accept checkbox without markdown link', async () => {
    github.context = {
      payload: {
        issue: {
          number: 201,
          user: { login: 'testuser' },
          body: `
- [x] I have checked the existing issues for duplicates.
- [x] I agree to follow this project's Code of Conduct.

### Node Version

v20.0.0

### NPM/Yarn/PNPM Version

npm 10.0.0

### Strapi Version

5.0.0

### Other Info
`,
        },
      },
      repo: { owner: 'strapi', repo: 'strapi' },
    };

    await action();

    expect(mockOctokit.rest.issues.addLabels).not.toHaveBeenCalled();
  });

  test('Should accept checkbox with various spacing', async () => {
    github.context = {
      payload: {
        issue: {
          number: 202,
          user: { login: 'testuser' },
          body: `
-   [x]   I have checked the existing issues for duplicates
-  [x]  I agree to follow Code of Conduct

### Node Version

v20.0.0

### NPM/Yarn/PNPM Version

npm 10.0.0

### Strapi Version

5.0.0

### Other Info
`,
        },
      },
      repo: { owner: 'strapi', repo: 'strapi' },
    };

    await action();

    expect(mockOctokit.rest.issues.addLabels).not.toHaveBeenCalled();
  });
});

describe('Error handling', () => {
  test('Should call setFailed on error', async () => {
    github.context = {
      payload: {
        issue: {
          number: 123,
          user: { login: 'testuser' },
          body: null, // This should cause an error
        },
      },
      repo: { owner: 'strapi', repo: 'strapi' },
    };

    const setFailed = jest.spyOn(core, 'setFailed');

    await action();

    expect(setFailed).toHaveBeenCalled();

    setFailed.mockRestore();
  });
});
