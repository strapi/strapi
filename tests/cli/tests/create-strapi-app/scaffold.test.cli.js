'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const coffee = require('coffee');

/**
 * Ensures create-strapi-app runs end-to-end after the Inquirer v9 migration.
 * Non-interactive mode skips the cloud prompt (which uses dynamic import('inquirer')).
 */
describe('create-strapi-app', () => {
  const repoRoot = path.resolve(__dirname, '../../../..');
  const bin = path.join(repoRoot, 'packages/cli/create-strapi-app/bin/index.js');

  it('scaffolds a project with --non-interactive --skip-cloud --no-install', async () => {
    if (!fs.existsSync(bin)) {
      throw new Error(
        `create-strapi-app bin missing at ${bin}; build the package first (yarn workspace create-strapi-app build)`
      );
    }

    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-csa-cli-test-'));

    try {
      const { stdout } = await coffee
        .spawn(
          process.execPath,
          [bin, projectDir, '--non-interactive', '--skip-cloud', '--no-install', '--no-git-init'],
          {
            cwd: repoRoot,
          }
        )
        .expect('code', 0)
        .end();

      expect(stdout).toContain('Your application was created');
      expect(fs.existsSync(path.join(projectDir, 'package.json'))).toBe(true);
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });
});
