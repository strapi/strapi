import { loadersFactory } from '../data-transfer';

jest.mock('ora', () =>
  jest.fn(() => ({
    start: jest.fn(),
    succeed: jest.fn(),
    fail: jest.fn(),
    text: '',
  }))
);

describe('loadersFactory / updateLoader (transfer progress line)', () => {
  test('includes count and size totals when totalBytes and totalCount are set', () => {
    const { updateLoader, getLoader } = loadersFactory();
    const t0 = 1_700_000_000_000;
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(t0 + 1000);

    updateLoader('assets', {
      assets: {
        startTime: t0,
        bytes: 100,
        count: 1,
        totalBytes: 400,
        totalCount: 4,
      },
    });

    const text = getLoader('assets').text;
    expect(text).toContain('1 / 4');
    expect(text).toMatch(/size:.*\/.*400/);

    dateSpy.mockRestore();
  });

  test('includes eta when elapsed >= 500ms, bytes in range, and totalBytes known', () => {
    const { updateLoader, getLoader } = loadersFactory();
    const t0 = 1_700_000_000_000;
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(t0 + 1000);

    updateLoader('assets', {
      assets: {
        startTime: t0,
        bytes: 500,
        count: 1,
        totalBytes: 1500,
        totalCount: 2,
      },
    });

    expect(getLoader('assets').text).toContain('eta ~');

    dateSpy.mockRestore();
  });

  test('omits eta when stage has finished (endTime set)', () => {
    const { updateLoader, getLoader } = loadersFactory();
    const t0 = 1_700_000_000_000;
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(t0 + 2000);

    updateLoader('assets', {
      assets: {
        startTime: t0,
        endTime: t0 + 2000,
        bytes: 1500,
        count: 2,
        totalBytes: 1500,
        totalCount: 2,
      },
    });

    expect(getLoader('assets').text).not.toContain('eta ~');

    dateSpy.mockRestore();
  });
});
