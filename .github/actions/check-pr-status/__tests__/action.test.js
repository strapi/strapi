'use strict';

jest.mock('@actions/github');
jest.mock('@actions/core');

const github = require('@actions/github');
const core = require('@actions/core');
const action = require('../index');

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
