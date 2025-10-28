#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Setting up Husky Git hooks...');

try {
  // Skip in CI or when explicitly disabled
  const isCI = process.env.CI;
  const huskyDisabled = process.env.HUSKY === '0' || process.env.HUSKY_SKIP_INSTALL === '1';
  const hasGitDir = fs.existsSync(path.join(process.cwd(), '.git'));

  if (isCI || huskyDisabled || !hasGitDir) {
    console.log('Skipping Husky setup.');
    process.exit(0);
  }

  // Install Husky
  console.log('Installing Husky...');
  execSync('./node_modules/.bin/husky install', { stdio: 'inherit' });

  // Manually create symlinks if they don't exist
  const preCommitHook = path.join('.git', 'hooks', 'pre-commit');
  const commitMsgHook = path.join('.git', 'hooks', 'commit-msg');
  const preCommitSource = path.join('.husky', 'pre-commit');
  const commitMsgSource = path.join('.husky', 'commit-msg');

  if (!fs.existsSync(preCommitHook)) {
    console.log('Creating pre-commit symlink...');
    fs.symlinkSync(path.resolve(preCommitSource), path.resolve(preCommitHook));
  }

  if (!fs.existsSync(commitMsgHook)) {
    console.log('Creating commit-msg symlink...');
    fs.symlinkSync(path.resolve(commitMsgSource), path.resolve(commitMsgHook));
  }

  // Verify hooks are created
  if (fs.existsSync(preCommitHook) && fs.existsSync(commitMsgHook)) {
    console.log('✅ Husky Git hooks installed successfully!');
    console.log('  - pre-commit: Runs lint-staged for code formatting and linting');
    console.log('  - commit-msg: Validates commit message format using commitlint');
  } else {
    console.log(
      '⚠️  Husky hooks may not be properly linked. Please run "yarn husky install" manually.'
    );
  }
} catch (error) {
  console.error('❌ Error setting up Husky:', error.message);
  process.exit(1);
}
