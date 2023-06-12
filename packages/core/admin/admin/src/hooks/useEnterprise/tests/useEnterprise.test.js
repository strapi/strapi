import { act, renderHook } from '@testing-library/react';

import { useEnterprise } from '../useEnterprise';

const CE_DATA_FIXTURE = ['CE'];
const EE_DATA_FIXTURE = ['EE'];

function setup(...args) {
  return renderHook(() => useEnterprise(...args));
}

describe('useEnterprise (CE)', () => {
  test('Returns CE data', async () => {
    const { result } = setup(CE_DATA_FIXTURE, async () => EE_DATA_FIXTURE);

    expect(result.current).toBe(CE_DATA_FIXTURE);
  });
});

describe('useEnterprise (EE)', () => {
  beforeAll(() => {
    window.strapi.isEE = true;
  });

  afterAll(() => {
    window.strapi.isEE = false;
  });

  test('Returns default data on first render and EE data on second', async () => {
    const { result } = setup(CE_DATA_FIXTURE, async () => EE_DATA_FIXTURE);

    await act(async () => {
      expect(result.current).toBe(null);
    });

    expect(result.current).toBe(EE_DATA_FIXTURE);
  });

  test('Combines CE and EE data', async () => {
    const { result } = setup(CE_DATA_FIXTURE, async () => EE_DATA_FIXTURE, {
      combine(ceData, eeData) {
        return [...ceData, ...eeData];
      },
    });

    await act(async () => {
      expect(result.current).toBe(null);
    });

    expect(result.current).toStrictEqual([...CE_DATA_FIXTURE, ...EE_DATA_FIXTURE]);
  });

  test('Returns EE data without custom combine', async () => {
    const { result } = setup(CE_DATA_FIXTURE, async () => EE_DATA_FIXTURE);

    await act(async () => {});

    await act(async () => {
      expect(result.current).toStrictEqual(EE_DATA_FIXTURE);
    });
  });

  test('Returns a custom defaultValue on first render', async () => {
    const { result } = setup(CE_DATA_FIXTURE, async () => EE_DATA_FIXTURE, {
      defaultValue: false,
    });

    await act(async () => {
      expect(result.current).toBe(false);
    });
  });
});
