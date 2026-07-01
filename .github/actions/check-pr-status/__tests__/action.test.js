'use strict';

jest.mock('@actions/github');
jest.mock('@actions/core');

const github = require('@actions/github');
const core = require('@actions/core');
const action = require('../index');

beforeEach(() => {
  jest.clearAllMocks();
});

test.each(action.BLOCKING_LABELS)('Test blocking labels %s', async (label) => {
  github.context = {
    payload: {
      pull_request: {
        labels: [{ name: label }],
      },
    },
  };

  const setFailed = jest.spyOn(core, 'setFailed');

  await action();

  expect(setFailed).toHaveBeenCalled();
  expect(setFailed.mock.calls[0][0]).toContain(`The PR has been labelled with a blocking label`);

  setFailed.mockRestore();
});

test('Test needs-qa blocks PR without QA completion label', async () => {
  github.context = {
    payload: {
      pull_request: {
        labels: [{ name: 'needs-qa' }, { name: 'pr: enhancement' }, { name: 'source: core' }],
      },
    },
  };

  const setFailed = jest.spyOn(core, 'setFailed');

  await action();

  expect(setFailed).toHaveBeenCalled();
  expect(setFailed.mock.calls[0][0]).toBe(
    `The PR has been labelled with 'needs-qa' and must be resolved with one of: qa-done, qa-skipped.`
  );

  setFailed.mockRestore();
});

test.each(action.QA_COMPLETION_LABELS)('Test needs-qa allows PR with %s label', async (label) => {
  github.context = {
    payload: {
      pull_request: {
        base: {
          ref: 'main',
        },
        author_association: 'MEMBER',
        labels: [
          { name: 'needs-qa' },
          { name: label },
          { name: 'pr: enhancement' },
          { name: 'source: core' },
        ],
      },
    },
  };

  const setFailed = jest.spyOn(core, 'setFailed');

  await action();

  expect(setFailed).not.toHaveBeenCalled();

  setFailed.mockRestore();
});

test('Test missing source label', async () => {
  github.context = {
    payload: {
      pull_request: {
        labels: [{ name: 'pr: enhancement' }],
      },
    },
  };

  const setFailed = jest.spyOn(core, 'setFailed');

  await action();

  expect(setFailed).toHaveBeenCalled();
  expect(setFailed.mock.calls[0][0]).toBe(`The PR must have one and only one 'source:' label.`);

  setFailed.mockRestore();
});

test('Test too many source label', async () => {
  github.context = {
    payload: {
      pull_request: {
        labels: [{ name: 'source: a' }, { name: 'source: b' }, { name: 'pr: enhancement' }],
      },
    },
  };

  const setFailed = jest.spyOn(core, 'setFailed');

  await action();

  expect(setFailed).toHaveBeenCalled();
  expect(setFailed.mock.calls[0][0]).toBe(`The PR must have one and only one 'source:' label.`);

  setFailed.mockRestore();
});

test('Test missing pr label', async () => {
  github.context = {
    payload: {
      pull_request: {
        labels: [{ name: 'source: core' }],
      },
    },
  };

  const setFailed = jest.spyOn(core, 'setFailed');

  await action();

  expect(setFailed).toHaveBeenCalled();
  expect(setFailed.mock.calls[0][0]).toBe(`The PR must have one and only one 'pr:' label.`);

  setFailed.mockRestore();
});

test('Test too many pr label', async () => {
  github.context = {
    payload: {
      pull_request: {
        labels: [{ name: 'pr: a' }, { name: 'pr: b' }, { name: 'source: core' }],
      },
    },
  };

  const setFailed = jest.spyOn(core, 'setFailed');

  await action();

  expect(setFailed).toHaveBeenCalled();
  expect(setFailed.mock.calls[0][0]).toBe(`The PR must have one and only one 'pr:' label.`);

  setFailed.mockRestore();
});

test('Test missing milestone for develop PR', async () => {
  github.context = {
    payload: {
      pull_request: {
        base: {
          ref: 'develop',
        },
        labels: [{ name: 'pr: enhancement' }, { name: 'source: core' }],
        milestone: null,
      },
    },
  };

  const setFailed = jest.spyOn(core, 'setFailed');

  await action();

  expect(setFailed).toHaveBeenCalled();
  expect(setFailed.mock.calls[0][0]).toBe(`The PR must have a milestone.`);

  setFailed.mockRestore();
});

test('Test missing milestone for non-develop PR', async () => {
  github.context = {
    payload: {
      pull_request: {
        base: {
          ref: 'main',
        },
        author_association: 'MEMBER',
        labels: [{ name: 'pr: enhancement' }, { name: 'source: core' }],
        milestone: null,
      },
    },
  };

  const setFailed = jest.spyOn(core, 'setFailed');

  await action();

  expect(setFailed).not.toHaveBeenCalled();

  setFailed.mockRestore();
});

test.each(['NONE', 'CONTRIBUTOR', 'FIRST_TIME_CONTRIBUTOR', 'COLLABORATOR'])(
  'Test community PR targeting main is blocked for %s author',
  async (authorAssociation) => {
    github.context = {
      payload: {
        pull_request: {
          base: {
            ref: 'main',
          },
          author_association: authorAssociation,
          labels: [{ name: 'pr: enhancement' }, { name: 'source: core' }],
        },
      },
    };

    const setFailed = jest.spyOn(core, 'setFailed');

    await action();

    expect(setFailed).toHaveBeenCalled();
    expect(setFailed.mock.calls[0][0]).toBe(
      'Community PRs must target `develop`, not `main`. Please edit the PR and change the base branch to `develop`.'
    );

    setFailed.mockRestore();
  }
);

test.each(action.STRAPI_ENGINEER_ASSOCIATIONS)(
  'Test Strapi engineer may target main (%s author)',
  async (authorAssociation) => {
    github.context = {
      payload: {
        pull_request: {
          base: {
            ref: 'main',
          },
          author_association: authorAssociation,
          labels: [{ name: 'pr: enhancement' }, { name: 'source: core' }],
          milestone: null,
        },
      },
    };

    const setFailed = jest.spyOn(core, 'setFailed');

    await action();

    expect(setFailed).not.toHaveBeenCalled();

    setFailed.mockRestore();
  }
);

test('Test community PR may target a feature branch (stacked PR)', async () => {
  github.context = {
    payload: {
      pull_request: {
        base: {
          ref: 'feat/part-one',
        },
        author_association: 'FIRST_TIME_CONTRIBUTOR',
        labels: [{ name: 'pr: enhancement' }, { name: 'source: core' }],
        milestone: null,
      },
    },
  };

  const setFailed = jest.spyOn(core, 'setFailed');

  await action();

  expect(setFailed).not.toHaveBeenCalled();

  setFailed.mockRestore();
});

test('Test develop PR with milestone', async () => {
  github.context = {
    payload: {
      pull_request: {
        base: {
          ref: 'develop',
        },
        labels: [{ name: 'pr: enhancement' }, { name: 'source: core' }],
        milestone: {
          title: '5.0.0',
        },
      },
    },
  };

  const setFailed = jest.spyOn(core, 'setFailed');

  await action();

  expect(setFailed).not.toHaveBeenCalled();

  setFailed.mockRestore();
});
