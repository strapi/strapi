import { act, render } from '@tests/utils';

import { NotificationConfig, useNotification } from '../Notifications';

const defaultNotificationConfig = {
  type: 'success',
  message: 'test',
} as const;

const Component = (notificationConfig: NotificationConfig) => {
  const { toggleNotification } = useNotification();

  const handleClick = () => {
    if (toggleNotification) {
      toggleNotification({ ...defaultNotificationConfig, ...notificationConfig });
    }
  };

  return (
    <button type="button" onClick={handleClick}>
      Trigger Notification
    </button>
  );
};

/**
 * TODO: re-implement this, user-event is not running without the timers
 */
describe.skip('Notifications', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('should by default it should render a basic notification and only one when triggered, it should disappear after 2500ms', async () => {
      const { user, getByRole, getByText, queryByText } = render(<Component />);

      await user.click(getByRole('button', { name: 'Trigger Notification' }));

      expect(getByText(/test/)).toBeInTheDocument();

      act(() => jest.advanceTimersByTime(3000));

      expect(queryByText(/test/)).not.toBeInTheDocument();
    });

    it('should render a link when passed as a prop', async () => {
      const { user, getByRole } = render(
        <Component
          link={{
            label: 'test-link',
            url: 'https://google.com',
          }}
        />
      );

      await user.click(getByRole('button', { name: 'Trigger Notification' }));

      expect(getByRole('link', { name: 'test-link' })).toBeInTheDocument();
    });

    it('should render a message when passed as a prop', async () => {
      const { user, getByRole, getByText } = render(<Component message="test-message" />);

      await user.click(getByRole('button', { name: 'Trigger Notification' }));

      expect(getByText('test-message')).toBeInTheDocument();
    });
  });

  describe('props', () => {
    it('when `toggleNotification` is called with `blockTransition = true` it should not remove the notification automatically', async () => {
      const { user, getByRole, queryAllByText } = render(<Component blockTransition />);

      await user.click(getByRole('button', { name: 'Trigger Notification' }));

      // eslint-disable-next-line jest-dom/prefer-in-document
      expect(queryAllByText(/test/)).toHaveLength(1);

      jest.advanceTimersByTime(3000);

      // eslint-disable-next-line jest-dom/prefer-in-document
      expect(queryAllByText(/test/)).toHaveLength(1);

      await user.click(getByRole('button', { name: 'Close' }));

      // eslint-disable-next-line jest-dom/prefer-in-document
      expect(queryAllByText(/test/)).toHaveLength(0);
    });

    it('should call onClose when the notification is closed', async () => {
      const onClose = jest.fn();
      const { user, getByRole, queryAllByText } = render(<Component onClose={onClose} />);

      await user.click(getByRole('button', { name: 'Trigger Notification' }));

      // eslint-disable-next-line jest-dom/prefer-in-document
      expect(queryAllByText(/test/)).toHaveLength(1);

      await user.click(getByRole('button', { name: 'Close' }));

      expect(onClose).toHaveBeenCalled();
    });

    it('should allow you to set a custom timeout for the notification', async () => {
      const { user, getByRole, queryByText, getByText } = render(<Component timeout={1000} />);

      await user.click(getByRole('button', { name: 'Trigger Notification' }));

      expect(getByText(/test/)).toBeInTheDocument();

      act(() => jest.advanceTimersByTime(1001));

      expect(queryByText(/test/)).not.toBeInTheDocument();
    });
  });

  it('should still remove existing notificaitons when a new one is triggered', async () => {
    const { user, getByRole, queryAllByText } = render(<Component />);

    await user.click(getByRole('button', { name: 'Trigger Notification' }));

    // eslint-disable-next-line jest-dom/prefer-in-document
    expect(queryAllByText(/test/)).toHaveLength(1);

    jest.advanceTimersByTime(2000);

    await user.click(getByRole('button', { name: 'Trigger Notification' }));

    expect(queryAllByText(/test/)).toHaveLength(2);

    act(() => jest.advanceTimersByTime(1500));

    // eslint-disable-next-line jest-dom/prefer-in-document
    expect(queryAllByText(/test/)).toHaveLength(1);
  });
});
