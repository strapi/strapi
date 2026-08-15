// A provider that rejects faster than image manipulation used to take down the process
// (github.com/strapi/strapi#27374). Jest evaluates tests in a vm context where `unhandledRejection`
// never reaches `process`, so the check runs in a real node process.
import { execFileSync } from 'child_process';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../../../../../../../..');
const scriptPath = path.join(__dirname, '../resources/fast-provider-rejection.ts');

describe('Upload image with a failing provider', () => {
  test('rejects the upload instead of terminating the process', () => {
    const output = execFileSync(
      process.execPath,
      ['--unhandled-rejections=strict', '--import', 'tsx', scriptPath],
      { cwd: repoRoot, encoding: 'utf8' }
    );

    expect(output.trim()).toBe('provider rejected');
  }, 60000);
});
