/* eslint-disable check-file/filename-naming-convention */
import { renderHook } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { useGetAiUsageQuery } from '../../services/ai';
import { useAIAvailability } from '../useAIAvailability';
import { getAIUsageWarningStorageKey, useAIUsageWarning } from '../useAIUsageWarning';

const baseAIUsageData = {
  subscription: {
    cmsAiEnabled: true,
    cmsAiCreditsBase: 1000,
    cmsAiCreditsMaxUsage: null,
  },
  cmsAiCreditsUsed: 800,
};

let mockUser: { id?: number | string; email?: string } | null = {
  id: 1,
  email: 'admin@strapi.io',
};
let mockIsAuthLoading = false;

jest.mock('../../../../../admin/src/features/Auth', () => ({
  ...jest.requireActual('../../../../../admin/src/features/Auth'),
  useAuth: jest.fn(
    (
      _consumerName: string,
      selector: (state: {
        user: { id?: number | string; email?: string } | null;
        isLoading: boolean;
      }) => unknown
    ) =>
      selector({
        user: mockUser,
        isLoading: mockIsAuthLoading,
      })
  ),
}));

jest.mock('react-router-dom', () => {
  return {
    useLocation: jest.fn(() => ({
      pathname: '/',
    })),
  };
});

const toggleNotification = jest.fn();

jest.mock('../../../../../admin/src/features/Notifications', () => {
  return {
    ...jest.requireActual('../../../../../admin/src/features/Notifications'),
    useNotification: jest.fn(() => ({
      toggleNotification,
    })),
  };
});

jest.mock('../../services/ai', () => ({
  useGetAiUsageQuery: jest.fn(() => ({
    data: baseAIUsageData,
    isLoading: false,
    error: null,
  })),
}));

jest.mock('../useAIAvailability', () => ({
  useAIAvailability: jest.fn(() => true),
}));

const setup = (threshold?: number) =>
  renderHook(() => useAIUsageWarning(threshold), {
    wrapper({ children }) {
      return <IntlProvider locale="en">{children}</IntlProvider>;
    },
  });

describe('useAIUsageWarning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    mockUser = { id: 1, email: 'admin@strapi.io' };
    mockIsAuthLoading = false;
  });

  it('should not display notification when AI is not available', () => {
    // @ts-expect-error – mock
    useAIAvailability.mockImplementationOnce(() => false);

    setup();
    expect(toggleNotification).not.toHaveBeenCalled();
  });

  it('should not display notification when data is loading', () => {
    // @ts-expect-error – mock
    useGetAiUsageQuery.mockImplementationOnce(() => ({
      data: null,
      isLoading: true,
      error: null,
    }));

    setup();
    expect(toggleNotification).not.toHaveBeenCalled();
  });

  it('should not display notification when there is an error', () => {
    // @ts-expect-error – mock
    useGetAiUsageQuery.mockImplementationOnce(() => ({
      data: null,
      isLoading: false,
      error: 'API Error',
    }));

    setup();
    expect(toggleNotification).not.toHaveBeenCalled();
  });

  it('should not display notification when AI is not enabled in subscription', () => {
    useGetAiUsageQuery.mockImplementationOnce(() => ({
      data: {
        ...baseAIUsageData,
        subscription: {
          ...baseAIUsageData.subscription,
          cmsAiEnabled: false,
        },
      },
      isLoading: false,
      error: null,
    }));

    setup();
    expect(toggleNotification).not.toHaveBeenCalled();
  });

  it('should not display notification when total credits is 0 or negative', () => {
    // @ts-expect-error – mock
    useGetAiUsageQuery.mockImplementationOnce(() => ({
      data: {
        ...baseAIUsageData,
        subscription: {
          ...baseAIUsageData.subscription,
          cmsAiCreditsBase: 0,
        },
      },
      isLoading: false,
      error: null,
    }));

    setup();
    expect(toggleNotification).not.toHaveBeenCalled();
  });

  it('should display warning notification at default threshold (80%)', () => {
    // @ts-expect-error – mock
    useGetAiUsageQuery.mockImplementationOnce(() => ({
      data: {
        ...baseAIUsageData,
        cmsAiCreditsUsed: 800, // 80% of 1000
      },
      isLoading: false,
      error: null,
    }));

    setup();

    expect(toggleNotification).toHaveBeenCalledWith({
      type: 'warning',
      message: "You've used 80% of your AI credits. 200 remain.",
      timeout: 5000,
    });
    expect(window.localStorage.getItem(getAIUsageWarningStorageKey(1))).toBe(JSON.stringify([80]));
  });

  it('should display warning notification at custom threshold (70%)', () => {
    // @ts-expect-error – mock
    useGetAiUsageQuery.mockImplementationOnce(() => ({
      data: {
        ...baseAIUsageData,
        cmsAiCreditsUsed: 700, // 70% of 1000
      },
      isLoading: false,
      error: null,
    }));

    setup(0.7);

    expect(toggleNotification).toHaveBeenCalledWith({
      type: 'warning',
      message: "You've used 70% of your AI credits. 300 remain.",
      timeout: 5000,
    });
    expect(window.localStorage.getItem(getAIUsageWarningStorageKey(1))).toBe(JSON.stringify([70]));
  });

  it('should display warning notification at 90%', () => {
    // @ts-expect-error – mock
    useGetAiUsageQuery.mockImplementationOnce(() => ({
      data: {
        ...baseAIUsageData,
        cmsAiCreditsUsed: 900, // 90% of 1000
      },
      isLoading: false,
      error: null,
    }));

    setup();

    expect(toggleNotification).toHaveBeenCalledWith({
      type: 'warning',
      message: "You've used 90% of your AI credits. 100 remain.",
      timeout: 5000,
    });
    expect(window.localStorage.getItem(getAIUsageWarningStorageKey(1))).toBe(JSON.stringify([90]));
  });

  it('should display danger notification when credits are exhausted (100%) with overages', () => {
    // @ts-expect-error – mock
    useGetAiUsageQuery.mockImplementationOnce(() => ({
      data: {
        ...baseAIUsageData,
        subscription: {
          ...baseAIUsageData.subscription,
          cmsAiCreditsMaxUsage: 1500, // Higher than base, allowing overages
        },
        cmsAiCreditsUsed: 1000, // 100% of 1000
      },
      isLoading: false,
      error: null,
    }));

    setup();

    expect(toggleNotification).toHaveBeenCalledWith({
      type: 'danger',
      message: "You've used 100% of your AI credits. Overages are being applied.",
      timeout: 5000,
    });
    expect(window.localStorage.getItem(getAIUsageWarningStorageKey(1))).toBe(JSON.stringify([100]));
  });

  it('should display danger notification when credits are exhausted (100%) without overages', () => {
    // @ts-expect-error – mock
    useGetAiUsageQuery.mockImplementationOnce(() => ({
      data: {
        ...baseAIUsageData,
        cmsAiCreditsUsed: 1000, // 100% of 1000
      },
      isLoading: false,
      error: null,
    }));

    setup();

    expect(toggleNotification).toHaveBeenCalledWith({
      type: 'danger',
      message: "You've exhausted your AI credits. No additional credits available.",
      timeout: 5000,
    });
    expect(window.localStorage.getItem(getAIUsageWarningStorageKey(1))).toBe(JSON.stringify([100]));
  });

  it('should display danger notification when credits are over 100%', () => {
    // @ts-expect-error – mock
    useGetAiUsageQuery.mockImplementationOnce(() => ({
      data: {
        ...baseAIUsageData,
        subscription: {
          ...baseAIUsageData.subscription,
          cmsAiCreditsMaxUsage: 1500, // Higher than base, allowing overages
        },
        cmsAiCreditsUsed: 1200, // 120% of 1000
      },
      isLoading: false,
      error: null,
    }));

    setup();

    expect(toggleNotification).toHaveBeenCalledWith({
      type: 'danger',
      message: "You've used 100% of your AI credits. Overages are being applied.",
      timeout: 5000,
    });
    expect(window.localStorage.getItem(getAIUsageWarningStorageKey(1))).toBe(JSON.stringify([100]));
  });

  it('should not display notification when usage is below threshold', () => {
    // @ts-expect-error – mock
    useGetAiUsageQuery.mockImplementationOnce(() => ({
      data: {
        ...baseAIUsageData,
        cmsAiCreditsUsed: 500, // 50% of 1000
      },
      isLoading: false,
      error: null,
    }));

    setup();

    expect(toggleNotification).not.toHaveBeenCalled();
  });

  it('should handle remaining credits calculation correctly when used credits exceed total', () => {
    // @ts-expect-error – mock
    useGetAiUsageQuery.mockImplementationOnce(() => ({
      data: {
        ...baseAIUsageData,
        cmsAiCreditsUsed: 1200, // More than 1000 total
      },
      isLoading: false,
      error: null,
    }));

    setup();

    // Should still show the 100% notification
    expect(toggleNotification).toHaveBeenCalledWith({
      type: 'danger',
      message: "You've exhausted your AI credits. No additional credits available.",
      timeout: 5000,
    });
  });

  it('should not repeat the same warning after rerender', () => {
    const { rerender } = setup();

    expect(toggleNotification).toHaveBeenCalledTimes(1);
    expect(toggleNotification).toHaveBeenCalledWith({
      type: 'warning',
      message: "You've used 80% of your AI credits. 200 remain.",
      timeout: 5000,
    });

    rerender();

    expect(toggleNotification).toHaveBeenCalledTimes(1);
  });

  it('should not repeat warning after reload/remount when storage persists', () => {
    const { unmount } = setup();

    expect(toggleNotification).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(getAIUsageWarningStorageKey(1))).toBe(JSON.stringify([80]));

    unmount();

    // Remount simulates page reload with persisted localStorage
    setup();

    expect(toggleNotification).toHaveBeenCalledTimes(1);
  });

  it('should display higher warning levels when usage increases after reload', () => {
    const { unmount } = setup();

    expect(toggleNotification).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(getAIUsageWarningStorageKey(1))).toBe(JSON.stringify([80]));

    unmount();

    // Reload with 90% usage
    // @ts-expect-error – mock
    useGetAiUsageQuery.mockImplementationOnce(() => ({
      data: {
        ...baseAIUsageData,
        cmsAiCreditsUsed: 900,
      },
      isLoading: false,
      error: null,
    }));

    setup();

    // 90% warning should be displayed, but 80% should not repeat
    expect(toggleNotification).toHaveBeenCalledTimes(2);
    expect(toggleNotification).toHaveBeenLastCalledWith({
      type: 'warning',
      message: "You've used 90% of your AI credits. 100 remain.",
      timeout: 5000,
    });
    expect(window.localStorage.getItem(getAIUsageWarningStorageKey(1))).toBe(
      JSON.stringify([80, 90])
    );
  });

  it('should isolate warning history between different admin users', () => {
    // User 1 mounts and sees 80% warning
    const { unmount } = setup();
    expect(toggleNotification).toHaveBeenCalledTimes(1);
    unmount();

    // User 2 logs in
    mockUser = { id: 2, email: 'user2@strapi.io' };
    setup();

    // User 2 should also see 80% warning because User 2 has separate history
    expect(toggleNotification).toHaveBeenCalledTimes(2);

    expect(window.localStorage.getItem(getAIUsageWarningStorageKey(1))).toBe(JSON.stringify([80]));
    expect(window.localStorage.getItem(getAIUsageWarningStorageKey(2))).toBe(JSON.stringify([80]));
  });

  it('should reset warning history when usage drops below 70%', () => {
    // Start at 80%
    // @ts-expect-error – mock
    useGetAiUsageQuery.mockImplementation(() => ({
      data: {
        ...baseAIUsageData,
        cmsAiCreditsUsed: 800,
      },
      isLoading: false,
      error: null,
    }));

    const { rerender } = setup();
    expect(toggleNotification).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(getAIUsageWarningStorageKey(1))).toBe(JSON.stringify([80]));

    // Usage drops to 60% (< 70%)
    // @ts-expect-error – mock
    useGetAiUsageQuery.mockImplementation(() => ({
      data: {
        ...baseAIUsageData,
        cmsAiCreditsUsed: 600,
      },
      isLoading: false,
      error: null,
    }));

    rerender();
    expect(window.localStorage.getItem(getAIUsageWarningStorageKey(1))).toBeNull();

    // Usage rises back to 80% in a new usage cycle
    // @ts-expect-error – mock
    useGetAiUsageQuery.mockImplementation(() => ({
      data: {
        ...baseAIUsageData,
        cmsAiCreditsUsed: 800,
      },
      isLoading: false,
      error: null,
    }));

    rerender();
    expect(toggleNotification).toHaveBeenCalledTimes(2);
    expect(window.localStorage.getItem(getAIUsageWarningStorageKey(1))).toBe(JSON.stringify([80]));
  });

  it('should not display notifications when authenticated user is missing or unresolved', () => {
    mockUser = null;

    setup();

    expect(toggleNotification).not.toHaveBeenCalled();
  });

  it('should not display notifications while auth is loading', () => {
    mockIsAuthLoading = true;

    setup();

    expect(toggleNotification).not.toHaveBeenCalled();
  });

  it('should handle invalid localStorage data safely without crashing', () => {
    // Corrupted JSON string
    window.localStorage.setItem(getAIUsageWarningStorageKey(1), '{broken-json');

    expect(() => setup()).not.toThrow();
    expect(toggleNotification).toHaveBeenCalledWith({
      type: 'warning',
      message: "You've used 80% of your AI credits. 200 remain.",
      timeout: 5000,
    });

    // Non-array JSON
    window.localStorage.setItem(
      getAIUsageWarningStorageKey(1),
      JSON.stringify({ notAnArray: true })
    );

    expect(() => setup()).not.toThrow();
  });

  it('should handle localStorage read failures safely without crashing', () => {
    const getItemSpy = jest.spyOn(window.localStorage, 'getItem').mockImplementationOnce(() => {
      throw new Error('SecurityError: Access is denied');
    });

    try {
      expect(() => setup()).not.toThrow();
      expect(toggleNotification).toHaveBeenCalledWith({
        type: 'warning',
        message: "You've used 80% of your AI credits. 200 remain.",
        timeout: 5000,
      });
    } finally {
      getItemSpy.mockRestore();
    }
  });

  it('should handle localStorage write failures safely without crashing', () => {
    const setItemSpy = jest.spyOn(window.localStorage, 'setItem').mockImplementationOnce(() => {
      throw new Error('QuotaExceededError');
    });

    try {
      expect(() => setup()).not.toThrow();
      expect(toggleNotification).toHaveBeenCalledWith({
        type: 'warning',
        message: "You've used 80% of your AI credits. 200 remain.",
        timeout: 5000,
      });
    } finally {
      setItemSpy.mockRestore();
    }
  });

  it('should show distinct warning levels as usage increases and persist each level', () => {
    // 80%
    // @ts-expect-error – mock
    useGetAiUsageQuery.mockImplementation(() => ({
      data: {
        ...baseAIUsageData,
        cmsAiCreditsUsed: 800,
      },
      isLoading: false,
      error: null,
    }));

    const { rerender } = setup();
    expect(toggleNotification).toHaveBeenCalledTimes(1);
    expect(toggleNotification).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'warning', message: expect.stringContaining('80%') })
    );
    expect(window.localStorage.getItem(getAIUsageWarningStorageKey(1))).toBe(JSON.stringify([80]));

    // 90%
    // @ts-expect-error – mock
    useGetAiUsageQuery.mockImplementation(() => ({
      data: {
        ...baseAIUsageData,
        cmsAiCreditsUsed: 900,
      },
      isLoading: false,
      error: null,
    }));

    rerender();
    expect(toggleNotification).toHaveBeenCalledTimes(2);
    expect(toggleNotification).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'warning', message: expect.stringContaining('90%') })
    );
    expect(window.localStorage.getItem(getAIUsageWarningStorageKey(1))).toBe(
      JSON.stringify([80, 90])
    );

    // 100%
    // @ts-expect-error – mock
    useGetAiUsageQuery.mockImplementation(() => ({
      data: {
        ...baseAIUsageData,
        cmsAiCreditsUsed: 1000,
      },
      isLoading: false,
      error: null,
    }));

    rerender();
    expect(toggleNotification).toHaveBeenCalledTimes(3);
    expect(toggleNotification).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'danger' })
    );
    expect(window.localStorage.getItem(getAIUsageWarningStorageKey(1))).toBe(
      JSON.stringify([80, 90, 100])
    );
  });
});
