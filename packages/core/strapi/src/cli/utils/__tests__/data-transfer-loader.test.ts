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
    expect(text).toMatch(/400\.0 B/);

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

    const line = getLoader('assets').text;
    expect(line).toContain(', ~');
    expect(line).toContain('remaining');

    dateSpy.mockRestore();
  });

  test('shows items/s for entities (not byte rate)', () => {
    const { updateLoader, getLoader } = loadersFactory();
    const t0 = 1_700_000_000_000;
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(t0 + 2000);

    updateLoader('entities', {
      entities: {
        startTime: t0,
        bytes: 50_000,
        count: 20,
      },
    });

    expect(getLoader('entities').text).toContain('10.0 items/s');

    dateSpy.mockRestore();
  });

  test('shows count-based eta for entities when totalCount is known', () => {
    const { updateLoader, getLoader } = loadersFactory();
    const t0 = 1_700_000_000_000;
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(t0 + 1000);

    updateLoader('entities', {
      entities: {
        startTime: t0,
        bytes: 100,
        count: 50,
        totalCount: 150,
      },
    });

    const line = getLoader('entities').text;
    expect(line).toContain('50 / 150');
    expect(line).toContain(', ~');
    expect(line).toContain('remaining');

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

    expect(getLoader('assets').text).not.toContain(' remaining');

    dateSpy.mockRestore();
  });
});
