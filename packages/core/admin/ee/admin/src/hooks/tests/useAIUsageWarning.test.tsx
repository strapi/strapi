/* eslint-disable check-file/filename-naming-convention */
import { renderHook } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { useGetAIUsageQuery } from '../../services/ai';
import { useAIAvailability } from '../useAIAvailability';
import { useAIUsageWarning } from '../useAIUsageWarning';

const baseAIUsageData = {
  subscription: {
    cmsAiEnabled: true,
    cmsAiCreditsBase: 1000,
    cmsAiCreditsMaxUsage: null,
  },
  cmsAiCreditsUsed: 800,
};

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
  useGetAIUsageQuery: jest.fn(() => ({
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
  });

  it('should not display notification when AI is not available', () => {
    // @ts-expect-error – mock
    useAIAvailability.mockImplementationOnce(() => false);

    setup();
    expect(toggleNotification).not.toHaveBeenCalled();
  });

  it('should not display notification when data is loading', () => {
    // @ts-expect-error – mock
    useGetAIUsageQuery.mockImplementationOnce(() => ({
      data: null,
      isLoading: true,
      error: null,
    }));

    setup();
    expect(toggleNotification).not.toHaveBeenCalled();
  });

  it('should not display notification when there is an error', () => {
    // @ts-expect-error – mock
    useGetAIUsageQuery.mockImplementationOnce(() => ({
      data: null,
      isLoading: false,
      error: 'API Error',
    }));

    setup();
    expect(toggleNotification).not.toHaveBeenCalled();
  });

  it('should not display notification when AI is not enabled in subscription', () => {
    // @ts-expect-error – mock
    useGetAIUsageQuery.mockImplementationOnce(() => ({
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
    useGetAIUsageQuery.mockImplementationOnce(() => ({
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
    useGetAIUsageQuery.mockImplementationOnce(() => ({
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
  });

  it('should display warning notification at custom threshold (70%)', () => {
    // @ts-expect-error – mock
    useGetAIUsageQuery.mockImplementationOnce(() => ({
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
  });

  it('should display warning notification at 90%', () => {
    // @ts-expect-error – mock
    useGetAIUsageQuery.mockImplementationOnce(() => ({
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
  });

  it('should display danger notification when credits are exhausted (100%) with overages', () => {
    // @ts-expect-error – mock
    useGetAIUsageQuery.mockImplementationOnce(() => ({
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
  });

  it('should display danger notification when credits are exhausted (100%) without overages', () => {
    // @ts-expect-error – mock
    useGetAIUsageQuery.mockImplementationOnce(() => ({
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
  });

  it('should display danger notification when credits are over 100%', () => {
    // @ts-expect-error – mock
    useGetAIUsageQuery.mockImplementationOnce(() => ({
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
  });

  it('should not display notification when usage is below threshold', () => {
    // @ts-expect-error – mock
    useGetAIUsageQuery.mockImplementationOnce(() => ({
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
    useGetAIUsageQuery.mockImplementationOnce(() => ({
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
});
