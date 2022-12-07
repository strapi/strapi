import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import axios from 'axios';

import TrackingContext from '../../../contexts/TrackingContext';
import useTracking from '..';
import useAppInfos from '../../useAppInfos';

jest.mock('../../useAppInfos');

jest.mock('axios', () => ({
  ...jest.requireActual('axios'),
  post: jest.fn(),
}));

function setup(props) {
  return new Promise((resolve) => {
    act(() => {
      resolve(
        renderHook(() => useTracking(), {
          wrapper: ({ children }) => (
            <TrackingContext.Provider
              value={{
                uuid: 1,
                telemetryProperties: {
                  nestedProperty: true,
                },
                ...props,
              }}
            >
              {children}
            </TrackingContext.Provider>
          ),
        })
      );
    });
  });
}

describe('useTracking', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Call trackUsage() with all attributes', async () => {
    useAppInfos.mockReturnValue({
      currentEnvironment: 'testing',
    });

    const { result } = await setup();

    result.current.trackUsage('event', { trackingProperty: true });

    expect(axios.post).toBeCalledWith(expect.any(String), {
      event: 'event',
      uuid: 1,
      properties: expect.objectContaining({
        environment: 'testing',
        nestedProperty: true,
        trackingProperty: true,
      }),
    });
  });

  test('Do not track if it has been disabled', async () => {
    window.strapi.telemetryDisabled = true;

    const { result } = await setup();

    result.current.trackUsage();

    expect(axios.post).not.toBeCalled();
  });

  test('Do not track if no uuid was set', async () => {
    window.strapi.telemetryDisabled = true;

    const { result } = await setup({
      uuid: null,
    });

    result.current.trackUsage();

    expect(axios.post).not.toBeCalled();

    window.strapi.telemetryDisabled = false;
  });

  test('Should fail gracefully if the request does not work', async () => {
    axios.post = jest.fn().mockRejectedValueOnce({});

    const { result } = await setup();

    expect(result.current.trackUsage).not.toThrow();
  });
});
