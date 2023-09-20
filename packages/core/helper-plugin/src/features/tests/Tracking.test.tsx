import { renderHook } from '@testing-library/react';
import axios from 'axios';

import { AppInfoProvider } from '../AppInfo';
import { TrackingProvider, TrackingProviderProps, useTracking } from '../Tracking';

jest.mock('axios', () => ({
  ...jest.requireActual('axios'),
  post: jest.fn().mockResolvedValue({
    success: true,
  }),
}));

const setup = (props?: TrackingProviderProps['value']) =>
  renderHook(() => useTracking(), {
    wrapper: ({ children }) => (
      <AppInfoProvider
        currentEnvironment="testing"
        userId="someTestUserId"
        shouldUpdateStrapi={false}
        setUserDisplayName={jest.fn()}
        userDisplayName="someTestUserDisplayName"
      >
        <TrackingProvider
          value={{
            uuid: '1',
            telemetryProperties: {
              useTypescriptOnServer: true,
            },
            deviceId: 'someTestDeviceId',
            ...props,
          }}
        >
          {children}
        </TrackingProvider>
      </AppInfoProvider>
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
        deviceId: 'someTestDeviceId',
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

  it('should not track if there is no uuid set in the context', async () => {
    const { result } = setup({
      uuid: false,
    });

    await result.current.trackUsage('didAccessAuthenticatedAdministration');

    expect(axios.post).not.toBeCalled();
  });

  it('should fail gracefully if the request does not work', async () => {
    axios.post = jest.fn().mockRejectedValueOnce({});

    const { result } = setup();

    const res = await result.current.trackUsage('didAccessAuthenticatedAdministration');

    expect(axios.post).toHaveBeenCalled();
    expect(res).toEqual(null);
    expect(result.current.trackUsage).not.toThrow();
  });
});
