import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import ts from 'typescript';

const serverConfigPath = path.resolve(__dirname, '../../tsconfigs/server.json');

describe('server tsconfig', () => {
  it('enables strict checking for projects that extend the shared preset', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-server-tsconfig-'));

    try {
      fs.writeFileSync(path.join(root, 'index.ts'), 'export const identity = (value) => value;\n');

      const configPath = path.join(root, 'tsconfig.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          extends: serverConfigPath,
          compilerOptions: {
            incremental: false,
            noEmit: true,
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

      expect(config).toBeDefined();
      expect(config?.options.strict).toBe(true);

      const program = ts.createProgram({
        rootNames: config?.fileNames ?? [],
        options: config?.options ?? {},
      });
      const diagnostics = ts.getPreEmitDiagnostics(program);

      expect(diagnostics).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 7006 })])
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
