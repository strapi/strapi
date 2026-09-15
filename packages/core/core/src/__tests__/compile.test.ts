import fs from 'node:fs';
import tsUtils from '@strapi/typescript-utils';

import compile from '../compile';

jest.mock('@strapi/typescript-utils', () => ({
  isUsingTypeScript: jest.fn(),
  resolveOutDir: jest.fn(),
  compile: jest.fn(),
}));

const tsUtilsMock = tsUtils as jest.Mocked<typeof tsUtils>;

describe('compile', () => {
  const appDir = '/app';
  const outDir = '/app/dist';

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.STRAPI_SKIP_COMPILE;
    tsUtilsMock.isUsingTypeScript.mockResolvedValue(true);
    tsUtilsMock.resolveOutDir.mockResolvedValue(outDir);
    tsUtilsMock.compile.mockResolvedValue(undefined);
  });

  afterAll(() => {
    delete process.env.STRAPI_SKIP_COMPILE;
  });

  it('compiles TypeScript projects by default', async () => {
    await expect(compile({ appDir })).resolves.toEqual({ appDir, distDir: outDir });
    expect(tsUtilsMock.compile).toHaveBeenCalledTimes(1);
  });

  it('does not compile JavaScript projects', async () => {
    tsUtilsMock.isUsingTypeScript.mockResolvedValue(false);

    await expect(compile({ appDir })).resolves.toEqual({ appDir, distDir: appDir });
    expect(tsUtilsMock.compile).not.toHaveBeenCalled();
  });

  it('reuses the existing build output when skipCompile is true', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValueOnce(true);

    await expect(compile({ appDir, skipCompile: true })).resolves.toEqual({
      appDir,
      distDir: outDir,
    });
    expect(tsUtilsMock.compile).not.toHaveBeenCalled();
  });

  it('reuses the existing build output when STRAPI_SKIP_COMPILE is true', async () => {
    process.env.STRAPI_SKIP_COMPILE = 'true';
    jest.spyOn(fs, 'existsSync').mockReturnValueOnce(true);

    await expect(compile({ appDir })).resolves.toEqual({ appDir, distDir: outDir });
    expect(tsUtilsMock.compile).not.toHaveBeenCalled();
  });

  it('lets an explicit skipCompile option override STRAPI_SKIP_COMPILE', async () => {
    process.env.STRAPI_SKIP_COMPILE = 'true';

    await compile({ appDir, skipCompile: false });
    expect(tsUtilsMock.compile).toHaveBeenCalledTimes(1);
  });

  it('exits when the compilation fails', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);
    tsUtilsMock.compile.mockRejectedValueOnce(new Error('compilation failed'));

    await compile({ appDir });
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });

  it('throws when skipping and no outDir is configured', async () => {
    tsUtilsMock.resolveOutDir.mockResolvedValue(undefined);

    await expect(compile({ appDir, skipCompile: true })).rejects.toThrow(
      'No "outDir" is configured in tsconfig.json'
    );
    expect(tsUtilsMock.compile).not.toHaveBeenCalled();
  });

  it('throws when skipping and the build output is missing', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValueOnce(false);

    await expect(compile({ appDir, skipCompile: true })).rejects.toThrow(
      `${outDir} directory not found`
    );
    expect(tsUtilsMock.compile).not.toHaveBeenCalled();
  });
});
