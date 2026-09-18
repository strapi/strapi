import assert from 'node:assert/strict';
import test from 'node:test';
import { createCommandRunner } from '../command-runner';

test('uses execFile argument arrays with shell disabled for hostile Git and Nx values', async () => {
  let call: { file: string; args: readonly string[]; options: Record<string, unknown> } | undefined;
  const execFile = ((
    file: string,
    args: readonly string[],
    options: Record<string, unknown>,
    callback: (error: Error | null, stdout: string | Buffer, stderr: string | Buffer) => void
  ) => {
    call = { file, args, options };
    callback(null, Buffer.from('out'), Buffer.from('err'));
  }) as never;
  const runner = createCommandRunner(execFile);
  const hostile = ['--files=a;$(not-run)', 'line\nnext.ts', '--', '"quoted"'];

  assert.deepEqual(
    await runner({
      executable: 'yarn',
      args: ['nx', 'show', 'projects', ...hostile],
      cwd: '/safe',
    }),
    { stdout: Buffer.from('out'), stderr: Buffer.from('err') }
  );
  assert.equal(call?.file, 'yarn');
  assert.deepEqual(call?.args, ['nx', 'show', 'projects', ...hostile]);
  assert.equal(call?.options.shell, false);
  assert.equal(call?.options.cwd, '/safe');
});
