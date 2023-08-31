import * as React from 'react';

import { act } from '@testing-library/react';
import { render } from '@tests/utils';

import {
  AutoReloadOverlayBlockerProvider,
  useAutoReloadOverlayBlocker,
} from '../AutoReloadOverlayBlocker';

const MAX_ELAPSED_TIME = 30 * 1000;

const Component = () => {
  const { lockAppWithAutoreload, unlockAppWithAutoreload } = useAutoReloadOverlayBlocker();

  return (
    <>
      <button type="button" onClick={() => lockAppWithAutoreload()}>
        Lock
      </button>
      <button type="button" onClick={() => unlockAppWithAutoreload()}>
        Unlock
      </button>
    </>
  );
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AutoReloadOverlayBlockerProvider>{children}</AutoReloadOverlayBlockerProvider>
);

describe('AutoReloadOverlayBlocker', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should lock the app', async () => {
    const { getByRole, user, getByText } = render(<Component />, {
      renderOptions: { wrapper },
      userEventOptions: { advanceTimers: jest.advanceTimersByTime },
    });

    await user.click(getByRole('button', { name: 'Lock' }));

    expect(getByText(/Waiting for restart/)).toBeInTheDocument();
  });

  it('should unlock the app', async () => {
    const { getByRole, user, getByText, queryByText } = render(<Component />, {
      renderOptions: { wrapper },
      userEventOptions: { advanceTimers: jest.advanceTimersByTime },
    });

    await user.click(getByRole('button', { name: 'Lock' }));
    expect(getByText(/Waiting for restart/)).toBeInTheDocument();
    await user.click(getByRole('button', { name: 'Unlock' }));
    expect(queryByText(/Waiting for restart/)).not.toBeInTheDocument();
  });

  it('should show failed message after 30s', async () => {
    const { getByRole, user, getByText } = render(<Component />, {
      renderOptions: { wrapper },
      userEventOptions: { advanceTimers: jest.advanceTimersByTime },
    });

    await user.click(getByRole('button', { name: 'Lock' }));

    expect(getByText(/Waiting for restart/)).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(MAX_ELAPSED_TIME));

    expect(getByText(/The restart is taking longer than expected/)).toBeInTheDocument();
  });
});
