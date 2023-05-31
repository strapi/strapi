import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import axios from 'axios';

import { useAppInfo } from '../AppInfo';
import { useTracking, TrackingProvider } from '../Tracking';

jest.mock('../AppInfo');

jest.mock('axios', () => ({
  ...jest.requireActual('axios'),
  post: jest.fn().mockResolvedValue({
    success: true,
  }),
}));

const setup = (props) =>
  renderHook(() => useTracking(), {
    wrapper: ({ children, ...restProps }) => (
      <TrackingProvider
        value={{
          uuid: '1',
          telemetryProperties: {
            nestedProperty: true,
          },
          deviceId: 'someTestDeviceId',
          ...restProps,
        }}
      >
        {children}
      </TrackingProvider>
    ),
    initialProps: props,
  });

describe('useTracking', () => {
  beforeAll(() => {
    window.strapi.telemetryDisabled = false;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call axios.post with all attributes by default when calling trackUsage()', async () => {
    useAppInfo.mockReturnValue({
      currentEnvironment: 'testing',
      userId: 'someTestUserId',
    });

    const { result } = setup();

    const res = await result.current.trackUsage('event', { trackingProperty: true });

    expect(axios.post).toBeCalledWith(
      'https://analytics.strapi.io/api/v2/track',
      {
        userId: 'someTestUserId',
        deviceId: 'someTestDeviceId',
        event: 'event',
        eventProperties: {
          trackingProperty: true,
        },
        groupProperties: {
          nestedProperty: true,
          projectId: '1',
          projectType: 'Community',
        },
        userProperties: {},
      },
      {
        headers: { 'Content-Type': 'application/json' },
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

    await result.current.trackUsage();

    expect(axios.post).not.toBeCalled();

    window.strapi.telemetryDisabled = false;
  });

  it('should not track if there is no uuid set in the context', async () => {
    const { result } = setup({
      uuid: null,
    });

    await result.current.trackUsage();

    expect(axios.post).not.toBeCalled();
  });

  it('should fail gracefully if the request does not work', async () => {
    axios.post = jest.fn().mockRejectedValueOnce({});

    const { result } = setup();

    const res = await result.current.trackUsage('event', { trackingProperty: true });

    expect(axios.post).toHaveBeenCalled();
    expect(res).toEqual(null);
    expect(result.current.trackUsage).not.toThrow();
  });
});
