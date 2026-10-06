import { renderHook } from '@tests/utils';

import { useStrapiApp } from '../../features/StrapiApp';
import { useTracking } from '../../features/Tracking';
import { useAuthenticatedAccessTracking } from '../useAuthenticatedAccessTracking';

jest.mock('../../features/Tracking', () => ({
  useTracking: jest.fn(),
}));

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
