import { createCommand } from 'commander';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

const TARGETS = ['claude-code', 'cursor', 'windsurf', 'vscode', 'gemini', 'codex', 'amp', 'zed'];

const action = async (targetModel: string) => {
  if (!TARGETS.includes(targetModel)) {
    throw new Error(`Invalid target: ${targetModel}. Must be one of: ${TARGETS.join(', ')}`);
  }
  try {
    // Read the .rules file content
    const rulesPath = path.resolve(__dirname, '.rules');
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');

    // Write to a temp file
    const tempFilePath = path.join(os.tmpdir(), `strapi-rules-${Date.now()}.rules`);
    fs.writeFileSync(tempFilePath, rulesContent);

    // Pass temp file to vibe-rules CLI
    const cmd = `npx vibe-rules convert unified ${targetModel} ${tempFilePath}`;
    execSync(cmd, { stdio: 'inherit' });
    console.log(`Rules file generated for ${targetModel}`);

    // Optionally, clean up temp file
    fs.unlinkSync(tempFilePath);
  } catch (err) {
    console.error('Error generating rules:', err);
    process.exit(1);
  }
};

/**
 * `$ strapi rules:generate <target>`
 */
const command = () => {
  return createCommand('rules:generate')
    .description('Transform a unified .rules file to a targeted AI model rule file')
    .argument('<target>', `Target AI model (${TARGETS.join(', ')})`)
    .action(action);
};

export { action, command };
