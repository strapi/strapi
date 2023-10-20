import { stripColor } from '../../tests/console';
import { createWorkspace } from '../../tests/workspaces';
import { init } from '../node/init';
import { defaultTemplate } from '../node/templates/internal/default';
import { Template, TemplateOrTemplateResolver, TemplateResolver } from '../node/templates/types';

const loggerMock = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('node', () => {
  /**
   * @note You can't use the default template because it has prompts and we can't
   * interact with the terminal when using the node-api. Instead we just pass a small
   * template that doesn't have any prompts to ensure it runs all the way through.
   */
  describe('init', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    const infoRegex = /^\[INFO\]\s+Creating a new package at/;
    const successRegex = /^\[SUCCESS\]\s+Wrote .*tests\/__tmp__\//;

    it('should init a package with the default template', async () => {
      const infoSpy = jest.spyOn(global.console, 'info').mockImplementation(() => {});

      const workspace = await createWorkspace();

      const template = await makeTemplateFromDefault(workspace.path, [
        {
          name: 'pkgName',
          answer: 'test',
        },
        {
          name: 'pkgName',
          answer: 'test',
        },
        {
          name: 'license',
          answer: 'MIT',
        },
        {
          name: 'typescript',
          answer: true,
        },
        {
          name: 'eslint',
          answer: true,
        },
      ]);

      await init({
        path: workspace.path,
        template,
      });

      expect(infoSpy.mock.calls).toHaveLength(12);

      const [info, ...successMsgs] = infoSpy.mock.calls;

      expect(infoRegex.test(stripColor(info.join('')))).toBeTruthy();

      successMsgs.forEach((msg) => {
        expect(successRegex.test(stripColor(msg.join('')))).toBeTruthy();
      });

      expect(getFilesProducedFromSuccessMessags(successMsgs)).toMatchInlineSnapshot(`
        [
          ".editorconfig",
          ".eslintignore",
          ".eslintrc",
          ".gitignore",
          ".prettierignore",
          ".prettierrc",
          "package.json",
          "src/index.ts",
          "tsconfig.build.json",
          "tsconfig.eslint.json",
          "tsconfig.json",
        ]
      `);

      await workspace.remove();
    });

    it('should init a package with the default template but not include typescript', async () => {
      const infoSpy = jest.spyOn(global.console, 'info').mockImplementation(() => {});

      const workspace = await createWorkspace();

      const template = await makeTemplateFromDefault(workspace.path, [
        {
          name: 'pkgName',
          answer: 'test',
        },
        {
          name: 'pkgName',
          answer: 'test',
        },
        {
          name: 'license',
          answer: 'MIT',
        },
        {
          name: 'typescript',
          answer: false,
        },
        {
          name: 'eslint',
          answer: true,
        },
      ]);

      await init({
        path: workspace.path,
        template,
      });

      expect(infoSpy.mock.calls).toHaveLength(9);

      const [info, ...successMsgs] = infoSpy.mock.calls;

      expect(infoRegex.test(stripColor(info.join('')))).toBeTruthy();

      successMsgs.forEach((msg) => {
        expect(successRegex.test(stripColor(msg.join('')))).toBeTruthy();
      });

      expect(getFilesProducedFromSuccessMessags(successMsgs)).toMatchInlineSnapshot(`
        [
          ".editorconfig",
          ".eslintignore",
          ".eslintrc",
          ".gitignore",
          ".prettierignore",
          ".prettierrc",
          "package.json",
          "src/index.js",
        ]
      `);

      await workspace.remove();
    });

    it('should init a package with the default template but not include eslint', async () => {
      const infoSpy = jest.spyOn(global.console, 'info').mockImplementation(() => {});

      const workspace = await createWorkspace();

      const template = await makeTemplateFromDefault(workspace.path, [
        {
          name: 'pkgName',
          answer: 'test',
        },
        {
          name: 'pkgName',
          answer: 'test',
        },
        {
          name: 'license',
          answer: 'MIT',
        },
        {
          name: 'typescript',
          answer: true,
        },
        {
          name: 'eslint',
          answer: false,
        },
      ]);

      await init({
        path: workspace.path,
        template,
      });

      expect(infoSpy.mock.calls).toHaveLength(9);

      const [info, ...successMsgs] = infoSpy.mock.calls;

      expect(infoRegex.test(stripColor(info.join('')))).toBeTruthy();

      successMsgs.forEach((msg) => {
        expect(successRegex.test(stripColor(msg.join('')))).toBeTruthy();
      });

      expect(getFilesProducedFromSuccessMessags(successMsgs)).toMatchInlineSnapshot(`
        [
          ".editorconfig",
          ".gitignore",
          ".prettierignore",
          ".prettierrc",
          "package.json",
          "src/index.ts",
          "tsconfig.build.json",
          "tsconfig.json",
        ]
      `);

      await workspace.remove();
    });

    it('should init a package with the default template but not include eslint or typescript', async () => {
      const infoSpy = jest.spyOn(global.console, 'info').mockImplementation(() => {});

      const workspace = await createWorkspace();

      const template = await makeTemplateFromDefault(workspace.path, [
        {
          name: 'pkgName',
          answer: 'test',
        },
        {
          name: 'pkgName',
          answer: 'test',
        },
        {
          name: 'license',
          answer: 'MIT',
        },
        {
          name: 'typescript',
          answer: false,
        },
        {
          name: 'eslint',
          answer: false,
        },
      ]);

      await init({
        path: workspace.path,
        template,
      });

      expect(infoSpy.mock.calls).toHaveLength(7);

      const [info, ...successMsgs] = infoSpy.mock.calls;

      expect(infoRegex.test(stripColor(info.join('')))).toBeTruthy();

      successMsgs.forEach((msg) => {
        expect(successRegex.test(stripColor(msg.join('')))).toBeTruthy();
      });

      expect(getFilesProducedFromSuccessMessags(successMsgs)).toMatchInlineSnapshot(`
        [
          ".editorconfig",
          ".gitignore",
          ".prettierignore",
          ".prettierrc",
          "package.json",
          "src/index.js",
        ]
      `);

      await workspace.remove();
    });

    it('should init a package with the provided template', async () => {
      const infoSpy = jest.spyOn(global.console, 'info').mockImplementation(() => {});

      const workspace = await createWorkspace();

      const template: TemplateOrTemplateResolver = {
        async getFiles() {
          return [
            {
              name: 'package.json',
              contents: '',
            },
            {
              name: 'README.md',
              contents: '',
            },
          ];
        },
      };

      await init({
        path: workspace.path,
        template,
      });

      expect(infoSpy.mock.calls).toHaveLength(3);

      const [info, ...successMsgs] = infoSpy.mock.calls;

      expect(infoRegex.test(stripColor(info.join('')))).toBeTruthy();

      successMsgs.forEach((msg) => {
        expect(successRegex.test(stripColor(msg.join('')))).toBeTruthy();
      });

      expect(getFilesProducedFromSuccessMessags(successMsgs)).toMatchInlineSnapshot(`
        [
          "package.json",
          "README.md",
        ]
      `);

      await workspace.remove();
    });
  });
});

const makeTemplateFromDefault = async (
  path: string,
  answers: Parameters<Template['getFiles']>['0']
) => {
  const template = await (defaultTemplate as TemplateResolver)({
    packagePath: path,
    cwd: '.',
    // @ts-expect-error it's okay to mock this.
    logger: loggerMock,
  });

  const files = await template.getFiles(answers);

  return {
    getFiles: async () => files,
  };
};

const getFilesProducedFromSuccessMessags = (successMsgs: Array<string[]>) => {
  const everythingAfterUUIDRegex =
    /([a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12})\/(.*)/;
  const filesProduce = successMsgs.map(([, msg]) => msg.match(everythingAfterUUIDRegex));

  return (filesProduce.filter((match) => match !== null) as RegExpMatchArray[]).map(
    ([, , file]) => file
  );
};
