import assert from 'node:assert/strict';
import test from 'node:test';
import { createCommandRunner } from '../command-runner';
test('command runner is an injectable no-shell boundary', async () => {
  let call: { file: string; args: readonly string[]; options: Record<string, unknown> } | undefined;
  const fake = ((
    file: string,
    args: readonly string[],
    options: Record<string, unknown>,
    callback: Function
  ) => {
    call = { file, args, options };
    callback(null, 'out', 'err');
  }) as never;
  const runner = createCommandRunner(fake);
  const hostile = ['a b', '"quote"', 'line\nnext', ';|$()', '--looks-like-option'];
  assert.deepEqual(
    await runner({ executable: 'gh', args: hostile, cwd: '/safe', env: { TEST: 'yes' } }),
    { stdout: 'out', stderr: 'err' }
  );
  assert.deepEqual(call?.args, hostile);
  assert.equal(call?.file, 'gh');
  assert.equal(call?.options.shell, false);
  assert.equal(call?.options.encoding, 'utf8');
  assert.equal(call?.options.maxBuffer, 1048576);
});
