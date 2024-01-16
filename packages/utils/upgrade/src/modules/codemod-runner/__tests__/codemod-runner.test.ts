import { vol, fs } from 'memfs';

import { projectFactory } from '../../project';
import { rangeFactory } from '../../version';
import { codemodRunnerFactory } from '../codemod-runner';
import { loggerFactory } from '../../logger';

jest.mock('fs', () => fs);
jest.mock('../../logger', () => ({
  loggerFactory: jest.fn().mockReturnValue({
    debug: jest.fn(),
    raw: jest.fn(),
  }),
}));

jest.mock('../../runner/code', () => ({
  ...jest.requireActual('../../runner/code'),
  codeRunnerFactory: jest.fn().mockReturnValue({
    run: jest.fn().mockImplementation(() => Promise.resolve([])),
    valid: jest.fn().mockReturnValue(true),
  }),
}));

jest.mock('../../format', () => ({
  ...jest.requireActual('../../format'),
  versionRange: jest.fn().mockImplementation((str: string) => str),
  highlight: jest.fn().mockImplementation((str: string) => str),
}));

const validCwd = '/__unit_tests__';
const currentStrapiVersion = '1.0.0';

const packageJSONFile = `{
  "name": "test",
  "version": "${currentStrapiVersion}",
  "dependencies": { "@strapi/strapi": "${currentStrapiVersion}" }
}`;

const srcFiles = {
  '1.1.1': {
    'a.code.ts': 'console.log("a.ts")',
    'b.code.ts': 'console.log("b.ts")',
  },
  '1.1.2': {
    'a.code.ts': 'console.log("a.ts")',
    'b.code.ts': 'console.log("b.ts")',
  },
};

const defaultVolume = { src: srcFiles, 'package.json': packageJSONFile };

describe('CodemodRunner', () => {
  const logger = loggerFactory({ debug: true });

  const mockDate = new Date('2023-01-01');
  vol.fromNestedJSON(defaultVolume, validCwd);

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });

  afterAll(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  it('handles when there are no codemods to run', async () => {
    const range = rangeFactory('5.0.0');
    const codemodRunner = codemodRunnerFactory(projectFactory(validCwd), range).setLogger(logger);
    const res = await codemodRunner.run(`${validCwd}/src`);
    expect(logger.debug).toHaveBeenCalledWith(`Found no codemods to run for 5.0.0`);
    expect(res.success).toBe(true);
  });

  it('runs codemods successfully', async () => {
    const range = rangeFactory('1.1.1');
    const codemodRunner = codemodRunnerFactory(projectFactory(validCwd), range).setLogger(
      loggerFactory({ debug: true })
    );
    const res = await codemodRunner.run(`${validCwd}/src`);
    expect(logger.debug).toHaveBeenCalledWith(`Found codemods for 1 version(s) using ${range}`);
    expect(res.success).toBe(true);
  });

  it('uses selectCodemodsCallback if provided with no codemods selected', async () => {
    const range = rangeFactory('1.1.1');
    const selectCodemodsCallback = jest.fn().mockResolvedValue([]);
    const codemodRunner = codemodRunnerFactory(projectFactory(validCwd), range)
      .setLogger(logger)
      .onSelectCodemods(selectCodemodsCallback);
    const res = await codemodRunner.run(`${validCwd}/src`);
    expect(selectCodemodsCallback).toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(`Found no codemods to run for 1.1.1`);
    expect(res.success).toBe(true);
  });

  it('uses selectCodemodsCallback if provided with codemods selected', async () => {
    const range = rangeFactory('>=1.0.0 <2.0.0');
    const selectCodemodsCallback = jest.fn().mockImplementation((codemods) => codemods.slice(1));
    const codemodRunner = codemodRunnerFactory(projectFactory(validCwd), range)
      .setLogger(logger)
      .onSelectCodemods(selectCodemodsCallback);
    const res = await codemodRunner.run(`${validCwd}/src`);
    expect(selectCodemodsCallback).toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(`Found codemods for 1 version(s) using ${range}`);
    expect(res.success).toBe(true);
  });

  it('handles dry run correctly', async () => {
    const range = rangeFactory('1.1.1');
    const codemodRunner = codemodRunnerFactory(projectFactory(validCwd), range)
      .setLogger(logger)
      .dry();
    const res = await codemodRunner.run(`${validCwd}/src`);
    expect(logger.debug).toHaveBeenCalledWith(`Found codemods for 1 version(s) using ${range}`);
    expect(res.success).toBe(true);
  });
});
