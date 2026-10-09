import fs from 'fs';
import path from 'path';

const templatesDir = path.resolve(__dirname, '..', '..', 'templates');

const templates = fs
  .readdirSync(templatesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

describe('generated project README', () => {
  it.each(templates)('%s documents non-interactive create', (template) => {
    const readme = fs.readFileSync(path.join(templatesDir, template, 'README.md'), 'utf8');

    expect(readme).toContain(
      '`--non-interactive` skips prompts and the Cloud login, and requires a directory.'
    );
    expect(readme).toContain('npx create-strapi-app my-project --non-interactive --skip-cloud');
  });
});
