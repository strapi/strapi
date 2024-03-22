import { renderHook } from '@tests/utils';
import axios from 'axios';

import { useInitQuery } from '../../services/admin';
import { AppInfoProvider } from '../AppInfo';
import { TrackingProvider, useTracking } from '../Tracking';

jest.mock('axios', () => ({
  ...jest.requireActual('axios'),
  post: jest.fn().mockResolvedValue({
    success: true,
  }),
}));

jest.mock('../../services/admin', () => ({
  useInitQuery: jest.fn().mockReturnValue({
    data: {
      uuid: '1',
    },
  }),
  useTelemetryPropertiesQuery: jest.fn().mockReturnValue({
    data: {
      useTypescriptOnServer: true,
    },
  }),
}));

const setup = () =>
  renderHook(() => useTracking(), {
    wrapper: ({ children }) => (
      <TrackingProvider>
        <AppInfoProvider
          currentEnvironment="testing"
          userId="someTestUserId"
          shouldUpdateStrapi={false}
        >
          {children}
        </AppInfoProvider>
      </TrackingProvider>
    ),
  });

describe('useTracking', () => {
  beforeAll(() => {
    window.strapi.telemetryDisabled = false;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call axios.post with all attributes by default when calling trackUsage()', async () => {
    const { result } = setup();

    const res = await result.current.trackUsage('didAccessAuthenticatedAdministration');

    expect(axios.post).toBeCalledWith(
      'https://analytics.strapi.io/api/v2/track',
      {
        userId: 'someTestUserId',
        event: 'didAccessAuthenticatedAdministration',
        eventProperties: {},
        groupProperties: {
          useTypescriptOnServer: true,
          projectId: '1',
          projectType: 'Community',
        },
        userProperties: {},
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Strapi-Event': 'didAccessAuthenticatedAdministration',
        },
      }
    );

    expect(res).toMatchInlineSnapshot(`
      {
        "success": true,
      }
    `);
  });

  it('should not fire axios.post if strapi.telemetryDisabled is true', async () => {
    window.strapi.telemetryDisabled = true;

    const { result } = setup();

    await result.current.trackUsage('didAccessAuthenticatedAdministration');

    expect(axios.post).not.toBeCalled();

    window.strapi.telemetryDisabled = false;
  });

  it('should fail gracefully if the request does not work', async () => {
    axios.post = jest.fn().mockRejectedValueOnce({});

    const { result } = setup();

    const res = await result.current.trackUsage('didAccessAuthenticatedAdministration');

    expect(axios.post).toHaveBeenCalled();
    expect(res).toEqual(null);
    expect(result.current.trackUsage).not.toThrow();
  });

  it('should not track if there is no uuid set in the context', async () => {
    jest.mocked(useInitQuery).mockReturnValue({
      data: {
        uuid: false,
      },
      refetch: jest.fn(),
    });

    const { result } = setup();

    await result.current.trackUsage('didAccessAuthenticatedAdministration');

    expect(axios.post).not.toBeCalled();
  });
});
