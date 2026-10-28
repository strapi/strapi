import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  appendSummary,
  escapeData,
  getBooleanInput,
  getInput,
  info,
  inputVariable,
  repositoryCoords,
  setFailed,
  setOutput,
  warning,
} from '../lib/actions.ts';

import type { ActionsEnv } from '../lib/actions.ts';

function stubEnv(variables: Record<string, string> = {}): ActionsEnv & {
  lines: string[];
  files: Record<string, string>;
} {
  const lines: string[] = [];
  const files: Record<string, string> = {};

  return {
    lines,
    files,
    read: (name) => variables[name],
    append(path, content) {
      files[path] = (files[path] ?? '') + content;
    },
    log: (line) => lines.push(line),
  };
}

describe('inputVariable', () => {
  it('matches the variable name the runner sets', () => {
    assert.equal(inputVariable('source_ref'), 'INPUT_SOURCE_REF');
    assert.equal(inputVariable('dry run'), 'INPUT_DRY_RUN');
  });
});

describe('escapeData', () => {
  it('escapes the characters that would end a workflow command early', () => {
    assert.equal(escapeData('100% done\r\nnext'), '100%25 done%0D%0Anext');
  });
});

describe('getInput', () => {
  it('trims the value', () => {
    assert.equal(getInput(stubEnv({ INPUT_VERSION: '  5.53.0 ' }), 'version'), '5.53.0');
  });

  it('returns an empty string for an absent optional input', () => {
    assert.equal(getInput(stubEnv(), 'version'), '');
  });

  it('throws for an absent required input', () => {
    assert.throws(
      () => getInput(stubEnv(), 'token', { required: true }),
      /Input required and not supplied: token/u
    );
  });
});

describe('getBooleanInput', () => {
  for (const value of ['true', 'True', 'TRUE']) {
    it(`reads ${value} as true`, () => {
      assert.equal(getBooleanInput(stubEnv({ INPUT_DRY_RUN: value }), 'dry_run'), true);
    });
  }

  for (const value of ['false', 'False', 'FALSE']) {
    it(`reads ${value} as false`, () => {
      assert.equal(getBooleanInput(stubEnv({ INPUT_DRY_RUN: value }), 'dry_run'), false);
    });
  }

  it('refuses to coerce anything else, rather than silently arming a real run', () => {
    assert.throws(
      () => getBooleanInput(stubEnv({ INPUT_DRY_RUN: 'yes' }), 'dry_run'),
      /Core Schema/u
    );
  });

  it('refuses an absent value', () => {
    assert.throws(() => getBooleanInput(stubEnv(), 'dry_run'), /Input required/u);
  });
});

describe('setOutput', () => {
  it('writes the heredoc form to the output file', () => {
    const env = stubEnv({ GITHUB_OUTPUT: '/tmp/out' });

    setOutput(env, 'version', '5.53.0', () => 'DELIM');

    assert.equal(env.files['/tmp/out'], 'version<<DELIM\n5.53.0\nDELIM\n');
  });

  it('keeps a multi-line value in one output', () => {
    const env = stubEnv({ GITHUB_OUTPUT: '/tmp/out' });

    setOutput(env, 'body', 'first\nsecond', () => 'DELIM');

    assert.equal(env.files['/tmp/out'], 'body<<DELIM\nfirst\nsecond\nDELIM\n');
  });

  it('refuses a value that contains the delimiter', () => {
    const env = stubEnv({ GITHUB_OUTPUT: '/tmp/out' });

    assert.throws(
      () => setOutput(env, 'body', 'contains DELIM here', () => 'DELIM'),
      /contains its own delimiter/u
    );
  });
});

describe('info and warning', () => {
  it('logs plainly', () => {
    const env = stubEnv();

    info(env, 'hello');

    assert.deepEqual(env.lines, ['hello']);
  });

  it('escapes a warning so a newline cannot forge a second command', () => {
    const env = stubEnv();

    warning(env, 'careful\nnow');

    assert.deepEqual(env.lines, ['::warning::careful%0Anow']);
  });
});

describe('setFailed', () => {
  it('emits the error command and marks the process failed', () => {
    const env = stubEnv();
    const previous = process.exitCode;

    setFailed(env, 'it broke');

    assert.deepEqual(env.lines, ['::error::it broke']);
    assert.equal(process.exitCode, 1);

    process.exitCode = previous;
  });
});

describe('appendSummary', () => {
  it('appends to the summary file', () => {
    const env = stubEnv({ GITHUB_STEP_SUMMARY: '/tmp/summary' });

    assert.equal(appendSummary(env, '# Report'), true);
    assert.equal(env.files['/tmp/summary'], '# Report\n');
  });

  it('reports the absence of a summary file instead of throwing', () => {
    const env = stubEnv();

    assert.equal(appendSummary(env, '# Report'), false);
    assert.deepEqual(env.files, {});
  });
});

describe('repositoryCoords', () => {
  it('splits the owner and repo', () => {
    assert.deepEqual(repositoryCoords(stubEnv({ GITHUB_REPOSITORY: 'strapi/strapi' })), {
      owner: 'strapi',
      repo: 'strapi',
    });
  });

  for (const value of ['', 'strapi', '/strapi', 'strapi/']) {
    it(`rejects ${JSON.stringify(value)}`, () => {
      assert.throws(() => repositoryCoords(stubEnv({ GITHUB_REPOSITORY: value })), /owner\/repo/u);
    });
  }
});
