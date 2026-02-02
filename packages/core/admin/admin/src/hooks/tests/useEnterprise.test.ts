import { renderHook, waitFor } from '@testing-library/react';

import { useEnterprise } from '../useEnterprise';

const CE_DATA_FIXTURE = ['CE'];
const EE_DATA_FIXTURE = ['EE'];

describe('useEnterprise (CE)', () => {
  test('Returns CE data', async () => {
    const { result } = renderHook(() =>
      useEnterprise(CE_DATA_FIXTURE, async () => EE_DATA_FIXTURE)
    );

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
    const { result } = renderHook(() =>
      useEnterprise(CE_DATA_FIXTURE, async () => EE_DATA_FIXTURE)
    );

    expect(result.current).toBe(null);

    await waitFor(() => expect(result.current).toBe(EE_DATA_FIXTURE));
  });

  test('Combines CE and EE data', async () => {
    const { result } = renderHook(() =>
      useEnterprise(CE_DATA_FIXTURE, async () => EE_DATA_FIXTURE, {
        combine(ceData, eeData) {
          return [...ceData, ...eeData];
        },
      })
    );

    expect(result.current).toBe(null);

    await waitFor(() =>
      expect(result.current).toStrictEqual([...CE_DATA_FIXTURE, ...EE_DATA_FIXTURE])
    );
  });

  test('Returns EE data without custom combine', async () => {
    const { result } = renderHook(() =>
      useEnterprise(CE_DATA_FIXTURE, async () => EE_DATA_FIXTURE)
    );

    await waitFor(() => expect(result.current).toStrictEqual(EE_DATA_FIXTURE));
  });

  test('Returns CE data, when enabled is set to false', async () => {
    const { result } = renderHook(() =>
      useEnterprise(CE_DATA_FIXTURE, async () => EE_DATA_FIXTURE, {
        enabled: false,
      })
    );

    await waitFor(() => expect(result.current).toStrictEqual(CE_DATA_FIXTURE));
  });

  test('Returns a custom defaultValue on first render followed by the EE data', async () => {
    const { result } = renderHook(() =>
      useEnterprise(CE_DATA_FIXTURE, async () => EE_DATA_FIXTURE, {
        defaultValue: false,
      })
    );

    expect(result.current).toBe(false);

    await waitFor(() => expect(result.current).toStrictEqual(EE_DATA_FIXTURE));
  });
});
