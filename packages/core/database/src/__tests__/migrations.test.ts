import { findMigrationsDir } from '../migrations';
import os from 'os';
import fs from 'fs-extra';
import path from 'path';

const playground = `${os.tmpdir()}/@strapi-playground/core/database/migrations/`;
beforeAll(async () => {
  fs.removeSync(playground);
  fs.ensureDirSync(playground);
});

describe('js project', () => {
  const projectDir = `${playground}/js-project`;
  beforeEach(async () => {
    fs.removeSync(projectDir);
    fs.ensureDirSync(projectDir);
    global.strapi = {
      dirs: {
        app: {
          root: projectDir,
        },
      },
    };
  });

  it('should find migration dir under root', async () => {
    const migrationDir = await findMigrationsDir(strapi.dirs.app.root);
    expect(path.resolve(migrationDir)).toBe(path.resolve(`${projectDir}/database/migrations`));
  });
});

describe('ts project', () => {
  const projectDir = `${playground}/ts-project`;

  beforeEach(async () => {
    fs.removeSync(projectDir);
    fs.ensureDirSync(projectDir);
    fs.writeFileSync(`${projectDir}/index.ts`, "export const hello = 'world';");
    fs.writeFileSync(
      `${projectDir}/tsconfig.json`,
      // language=JSON
      `{
        "compilerOptions": {
          "outDir": "dist",
          "rootDir": "."
        },
        "include": [
          "./"
        ]
      }`
    );
    global.strapi = {
      dirs: {
        app: {
          root: projectDir,
        },
      },
    };
  });

  it('should find migration dir under root/dist', async () => {
    const migrationDir = await findMigrationsDir(strapi.dirs.app.root);
    expect(path.resolve(migrationDir)).toBe(path.resolve(`${projectDir}/dist/database/migrations`));
  });
});
