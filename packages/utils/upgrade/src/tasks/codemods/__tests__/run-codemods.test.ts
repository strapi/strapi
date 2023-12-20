import { runCodemods } from '../run-codemods';
import { timerFactory } from '../../../modules/timer';
import { projectFactory } from '../../../modules/project';
import { codemodRunnerFactory } from '../../../modules/codemod-runner';
import { rangeFactory } from '../../../modules/version';
import { loggerFactory } from '../../../modules/logger';

jest.mock('../../modules/timer');
jest.mock('../../modules/project');
jest.mock('../../modules/codemod-runner');
jest.mock('../../modules/version');

describe('runCodemods', () => {
  beforeEach(() => {
    // Mock implementations
    (timerFactory as jest.Mock).mockImplementation(() => ({
      start: jest.fn(),
      stop: jest.fn(),
      elapsedMs: 100,
    }));

    (projectFactory as jest.Mock).mockImplementation(() => ({
      strapiVersion: '1.0.0',
    }));

    (codemodRunnerFactory as jest.Mock).mockImplementation(() => ({
      dry: jest.fn().mockReturnThis(),
      onSelectCodemods: jest.fn().mockReturnThis(),
      setLogger: jest.fn().mockReturnThis(),
      run: jest.fn().mockResolvedValue({ success: true }),
    }));

    (rangeFactory as jest.Mock).mockImplementation((version) => version);
  });

  it('should run codemods successfully', async () => {
    const options = { logger: loggerFactory(), cwd: '/test' };
    await runCodemods(options);
    expect(options.logger.info).toHaveBeenCalledWith(expect.stringContaining('Completed in'));
  });

  // Add more tests for error cases, different options, etc.
});
