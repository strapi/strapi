import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import ts from 'typescript';

const serverConfigPath = path.resolve(__dirname, '../../tsconfigs/server.json');

describe('server tsconfig', () => {
  it.each([
    {
      name: 'preserves non-strict checking for existing consumers',
      compilerOptions: {},
      strict: false,
      diagnosticCodes: [],
    },
    {
      name: 'enables strict checking when the consumer opts in',
      compilerOptions: { strict: true },
      strict: true,
      diagnosticCodes: [7006, 2322],
    },
    {
      name: 'respects an explicit non-strict consumer override',
      compilerOptions: { strict: false },
      strict: false,
      diagnosticCodes: [],
    },
  ])('$name', ({ compilerOptions, strict, diagnosticCodes }) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-server-tsconfig-'));

    try {
      fs.writeFileSync(
        path.join(root, 'index.ts'),
        'export const identity = (value) => value;\nexport const nullable: string = null;\n'
      );

      const configPath = path.join(root, 'tsconfig.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          extends: serverConfigPath,
          compilerOptions: {
            incremental: false,
            noEmit: true,
            types: [],
            ...compilerOptions,
          },
          include: ['./index.ts'],
        })
      );

      const config = ts.getParsedCommandLineOfConfigFile(
        configPath,
        {},
        {
          ...ts.sys,
          onUnRecoverableConfigFileDiagnostic(diagnostic) {
            throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
          },
        }
      );

      if (!config) {
        throw new Error('Failed to parse the server tsconfig');
      }

      expect(config.errors).toEqual([]);
      expect(config.options.strict).toBe(strict);

      const program = ts.createProgram({
        rootNames: config.fileNames,
        options: config.options,
      });
      const diagnostics = ts.getPreEmitDiagnostics(program);

      expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual(diagnosticCodes);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
