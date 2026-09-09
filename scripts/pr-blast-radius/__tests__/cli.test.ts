import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCliArgs } from '../cli';
import { BlastRadiusError, ExitCode } from '../errors';

test('parses numbers and canonical PR URL variants', () => {
  for (const argv of [
    ['00123'],
    ['--json', '123'],
    ['https://github.com/strapi/strapi/pull/123/'],
    ['https://github.com/strapi/strapi/pull/123/?x=1#part', '--json'],
  ]) {
    assert.deepEqual(parseCliArgs(argv), {
      repository: 'strapi/strapi',
      pullRequest: 123,
      json: argv.includes('--json'),
    });
  }
});

test('rejects unsafe and unexpected input as invalid CLI input', () => {
  for (const argv of [
    [],
    ['0'],
    ['1.2'],
    ['https://github.com/other/repo/pull/1'],
    ['http://github.com/strapi/strapi/pull/1'],
    ['https://github.com/strapi/strapi/pulls/1'],
    ['123', '456'],
    ['--json', '--json', '1'],
    ['--', '1'],
  ]) {
    assert.throws(
      () => parseCliArgs(argv),
      (error: unknown) =>
        error instanceof BlastRadiusError && error.exitCode === ExitCode.InvalidInput
    );
  }
});
