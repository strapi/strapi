import { renderHook, waitFor } from '@tests/utils';

import { useLicenseLimits } from '../useLicenseLimits';

describe('useLicenseLimits', () => {
  it('should fetch the license limit information', async () => {
    const { result } = renderHook(() => useLicenseLimits());

    expect(result.current.license).toEqual(undefined);

    await waitFor(() => expect(result.current.isLoading).toBeFalsy());

    expect(result.current.license).toEqual(
      expect.objectContaining({
        attribute: 1,
        features: expect.any(Array),
      })
    );
  });

  it('exposes a getFeature() method as a shortcut to feature options', async () => {
    const { result } = renderHook(() => useLicenseLimits());

    expect(result.current.getFeature('sso')).toStrictEqual({});
    expect(result.current.getFeature('audit-logs')).toStrictEqual({});

    await waitFor(() => expect(result.current.isLoading).toBeFalsy());

    expect(result.current.getFeature('sso')).toStrictEqual({});
    expect(result.current.getFeature('audit-logs')).toStrictEqual({ retentionDays: 1 });
  });

  it('does return an empty object of enabled == false', async () => {
    const { result } = renderHook(() => useLicenseLimits({ enabled: false }));

    await waitFor(() => expect(result.current.isLoading).toBeFalsy());

    expect(result.current.license).toStrictEqual(undefined);
  });
});
