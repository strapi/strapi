import { renderHook } from '@tests/utils';

import { useStrapiApp } from '../../features/StrapiApp';
import { useTracking } from '../../features/Tracking';
import { useTelemetryPropertiesQuery } from '../../services/admin';
import { useAuthenticatedAccessTracking } from '../useAuthenticatedAccessTracking';

jest.mock('../../features/Tracking', () => ({
  useTracking: jest.fn(),
}));

jest.mock('../../services/admin', () => {
  const actual = jest.requireActual('../../services/admin');

  return {
    ...actual,
    useTelemetryPropertiesQuery: jest.fn(() => ({
      isSuccess: true,
      isError: false,
    })),
  };
});

jest.mock('../../features/StrapiApp', () => {
  const actual = jest.requireActual('../../features/StrapiApp');

  return {
    ...actual,
    useStrapiApp: jest.fn(),
  };
});

const trackUsage = jest.fn();
const getAllWidgets = () => [{ uid: 'widget-a' }];

describe('useAuthenticatedAccessTracking', () => {
  beforeEach(() => {
    trackUsage.mockClear();
    jest.mocked(useStrapiApp).mockReturnValue(getAllWidgets);
    jest.mocked(useTracking).mockReturnValue({
      trackUsage,
      isStrapiVersionReady: false,
    });
    jest.mocked(useTelemetryPropertiesQuery).mockReturnValue({
      isSuccess: true,
      isError: false,
    } as ReturnType<typeof useTelemetryPropertiesQuery>);
  });

  it('does not send the login event until the Strapi version is ready', () => {
    const { rerender } = renderHook(
      ({ projectId, ready }) => {
        jest.mocked(useTracking).mockReturnValue({
          trackUsage,
          isStrapiVersionReady: ready,
        });

        useAuthenticatedAccessTracking(projectId);
      },
      { initialProps: { projectId: undefined as string | null | undefined, ready: false } }
    );

    expect(trackUsage).not.toHaveBeenCalled();

    rerender({ projectId: 'project-1', ready: false });

    expect(trackUsage).not.toHaveBeenCalled();

    rerender({ projectId: 'project-1', ready: true });

    expect(trackUsage).toHaveBeenCalledTimes(1);
    expect(trackUsage).toHaveBeenCalledWith('didAccessAuthenticatedAdministration', {
      registeredWidgets: ['widget-a'],
      projectId: 'project-1',
    });
  });

  it('waits for telemetry properties so the single login event still includes them', () => {
    const trackUsageBeforeProperties = jest.fn();
    const trackUsageAfterProperties = jest.fn();

    const { rerender } = renderHook(
      ({ currentTrackUsage, settled }: { currentTrackUsage: jest.Mock; settled: boolean }) => {
        jest.mocked(useTelemetryPropertiesQuery).mockReturnValue({
          isSuccess: settled,
          isError: false,
        } as ReturnType<typeof useTelemetryPropertiesQuery>);
        jest.mocked(useTracking).mockReturnValue({
          trackUsage: currentTrackUsage,
          isStrapiVersionReady: true,
        });

        useAuthenticatedAccessTracking('project-1');
      },
      {
        initialProps: { currentTrackUsage: trackUsageBeforeProperties, settled: false },
      }
    );

    expect(trackUsageBeforeProperties).not.toHaveBeenCalled();

    rerender({ currentTrackUsage: trackUsageAfterProperties, settled: true });

    expect(trackUsageBeforeProperties).not.toHaveBeenCalled();
    expect(trackUsageAfterProperties).toHaveBeenCalledTimes(1);
    expect(trackUsageAfterProperties).toHaveBeenCalledWith('didAccessAuthenticatedAdministration', {
      registeredWidgets: ['widget-a'],
      projectId: 'project-1',
    });
  });

  it('sends the login event once when telemetry properties fail', () => {
    jest.mocked(useTelemetryPropertiesQuery).mockReturnValue({
      isSuccess: false,
      isError: true,
    } as ReturnType<typeof useTelemetryPropertiesQuery>);
    jest.mocked(useTracking).mockReturnValue({
      trackUsage,
      isStrapiVersionReady: true,
    });

    renderHook(() => useAuthenticatedAccessTracking('project-1'));

    expect(trackUsage).toHaveBeenCalledTimes(1);
  });

  it('sends the login event once when trackUsage changes after the version is ready', () => {
    const firstTrackUsage = jest.fn();
    const secondTrackUsage = jest.fn();

    const { rerender } = renderHook(
      ({ currentTrackUsage }) => {
        jest.mocked(useTracking).mockReturnValue({
          trackUsage: currentTrackUsage,
          isStrapiVersionReady: true,
        });

        useAuthenticatedAccessTracking('project-1');
      },
      { initialProps: { currentTrackUsage: firstTrackUsage } }
    );

    expect(firstTrackUsage).toHaveBeenCalledTimes(1);

    rerender({ currentTrackUsage: secondTrackUsage });

    expect(firstTrackUsage).toHaveBeenCalledTimes(1);
    expect(secondTrackUsage).not.toHaveBeenCalled();
  });
});
