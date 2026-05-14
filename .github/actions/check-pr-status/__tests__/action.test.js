'use strict';

function loadAction() {
  const github = require('@actions/github');
  const core = require('@actions/core');
  const { run, BLOCKING_LABELS } = require('../src/check-pr');
  return { github, core, run, BLOCKING_LABELS };
}

beforeEach(() => {
  jest.resetModules();
});

test.each([`flag: 💥 Breaking change`, `flag: don't merge`])(
  'Test blocking labels %s',
  async (label) => {
    const { github, core, run } = loadAction();
    github.context = {
      payload: {
        pull_request: {
          labels: [{ name: label }],
        },
      },
    };

    const setFailed = jest.spyOn(core, 'setFailed');

    await run();

    expect(setFailed).toHaveBeenCalled();
    expect(setFailed.mock.calls[0][0]).toContain(`The PR has been labelled with a blocking label`);

    setFailed.mockRestore();
  }
);

test('Test missing source label', async () => {
  const { github, core, run } = loadAction();
  github.context = {
    payload: {
      pull_request: {
        labels: [{ name: 'pr: enhancement' }],
      },
    },
  };

  const setFailed = jest.spyOn(core, 'setFailed');

  await run();

  expect(setFailed).toHaveBeenCalled();
  expect(setFailed.mock.calls[0][0]).toBe(`The PR must have one and only one 'source:' label.`);

  setFailed.mockRestore();
});

test('Test too many source label', async () => {
  const { github, core, run } = loadAction();
  github.context = {
    payload: {
      pull_request: {
        labels: [{ name: 'source: a' }, { name: 'source: b' }, { name: 'pr: enhancement' }],
      },
    },
  };

  const setFailed = jest.spyOn(core, 'setFailed');

  await run();

  expect(setFailed).toHaveBeenCalled();
  expect(setFailed.mock.calls[0][0]).toBe(`The PR must have one and only one 'source:' label.`);

  setFailed.mockRestore();
});

test('Test missing pr label', async () => {
  const { github, core, run } = loadAction();
  github.context = {
    payload: {
      pull_request: {
        labels: [{ name: 'source: core' }],
      },
    },
  };

  const setFailed = jest.spyOn(core, 'setFailed');

  await run();

  expect(setFailed).toHaveBeenCalled();
  expect(setFailed.mock.calls[0][0]).toBe(`The PR must have one and only one 'pr:' label.`);

  setFailed.mockRestore();
});

test('Test too many pr label', async () => {
  const { github, core, run } = loadAction();
  github.context = {
    payload: {
      pull_request: {
        labels: [{ name: 'pr: a' }, { name: 'pr: b' }, { name: 'source: core' }],
      },
    },
  };

  const setFailed = jest.spyOn(core, 'setFailed');

  await run();

  expect(setFailed).toHaveBeenCalled();
  expect(setFailed.mock.calls[0][0]).toBe(`The PR must have one and only one 'pr:' label.`);

  setFailed.mockRestore();
});

test('Test missing milestone for develop PR', async () => {
  const { github, core, run } = loadAction();
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

  await run();

  expect(setFailed).toHaveBeenCalled();
  expect(setFailed.mock.calls[0][0]).toBe(`The PR must have a milestone.`);

  setFailed.mockRestore();
});

test('Test missing milestone for non-develop PR', async () => {
  const { github, core, run } = loadAction();
  github.context = {
    payload: {
      pull_request: {
        base: {
          ref: 'main',
        },
        labels: [{ name: 'pr: enhancement' }, { name: 'source: core' }],
        milestone: null,
      },
    },
  };

  const setFailed = jest.spyOn(core, 'setFailed');

  await run();

  expect(setFailed).not.toHaveBeenCalled();

  setFailed.mockRestore();
});

test('Test develop PR with milestone', async () => {
  const { github, core, run } = loadAction();
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

  await run();

  expect(setFailed).not.toHaveBeenCalled();

  setFailed.mockRestore();
});
