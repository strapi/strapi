import fs from 'fs';
import path from 'path';

const DEFAULT_OUT_DIR = 'dist';

/**
 * Strip `//` and `/* *\/` comments from JSON-like text without loading `typescript`.
 */
const stripJsonComments = (input: string): string => {
  let result = '';
  let inString = false;
  let stringChar = '';
  let i = 0;

  while (i < input.length) {
    const char = input[i];
    const next = input[i + 1];

    if (inString) {
      result += char;

      if (char === '\\') {
        result += input[i + 1] ?? '';
        i += 2;
      } else if (char === stringChar) {
        inString = false;
        i += 1;
      } else {
        i += 1;
      }
    } else if (char === '"' || char === "'") {
      inString = true;
      stringChar = char;
      result += char;
      i += 1;
    } else if (char === '/' && next === '/') {
      while (i < input.length && input[i] !== '\n') {
        i += 1;
      }
    } else if (char === '/' && next === '*') {
      i += 2;
      while (i < input.length && !(input[i] === '*' && input[i + 1] === '/')) {
        i += 1;
      }
      i += 2;
    } else {
      result += char;
      i += 1;
    }
  }

  return result;
};

/**
 * Read `compilerOptions.outDir` from tsconfig.json without loading `typescript` or
 * `@strapi/typescript-utils`. Returns null when the file cannot be parsed or when
 * `extends` may define outDir (fall back to resolveOutDir).
 */
const tryQuickOutDir = (appDir: string, tsconfigPath: string): string | null => {
  let raw: unknown;

  try {
    const contents = fs.readFileSync(tsconfigPath, 'utf8');
    raw = JSON.parse(stripJsonComments(contents));
  } catch {
    return null;
  }

  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const config = raw as { extends?: string; compilerOptions?: { outDir?: string } };
  const localOutDir = config.compilerOptions?.outDir;

  if (config.extends && localOutDir === undefined) {
    return null;
  }

  return path.resolve(appDir, localOutDir ?? DEFAULT_OUT_DIR);
};

export { tryQuickOutDir, stripJsonComments };
