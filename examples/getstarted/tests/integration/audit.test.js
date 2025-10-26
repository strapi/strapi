const { spawn } = require('child_process');
const path = require('path');

jest.setTimeout(5 * 60 * 1000); // 5 minutes as starting Strapi can be slow

test('integration: audit logging records a content change (script)', (done) => {
  const script = path.resolve(__dirname, '../../scripts/integration-test-audit.js');
  const proc = spawn(process.execPath, [script], { stdio: 'inherit' });

  proc.on('error', (err) => {
    done(err);
  });

  proc.on('exit', (code) => {
    // The script exits 0 on success, 2 when no audit logs found or creation failed,
    // 1 for other errors. Consider 0 as pass; if audit model missing we'll skip by failing with a clear message.
    if (code === 0) return done();

    const err = new Error(`Integration script exited with code ${code}. See console output for details.`);
    return done(err);
  });
});
