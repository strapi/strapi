import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import en from '../../../../translations/en.json';

const aiChatDirectory = join(__dirname, '..', '..');

const listSourceFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);

    if (statSync(path).isDirectory()) {
      return name === 'tests' ? [] : listSourceFiles(path);
    }

    return /\.tsx?$/.test(name) && !name.includes('.test.') ? [path] : [];
  });

describe('CTB | AIChat | translation ids', () => {
  it('declares in en.json every id passed to t()', () => {
    const usedIds = listSourceFiles(aiChatDirectory).flatMap((path) =>
      [...readFileSync(path, 'utf8').matchAll(/\bt\(\s*'([^']+)'/g)].map((match) => match[1])
    );

    const missingIds = [...new Set(usedIds)].filter((id) => !(id in en));

    expect(usedIds.length).toBeGreaterThan(0);
    expect(missingIds).toEqual([]);
  });
});
