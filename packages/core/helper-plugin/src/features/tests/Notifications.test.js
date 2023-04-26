import React from 'react';
import { render as renderRTL } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { NotificationsProvider, useNotification } from '../Notifications';

const defaultNotificationConfig = {
  type: 'success',
  message: 'test',
};

// eslint-disable-next-line react/prop-types
const Component = (notificationConfig) => {
  const toggleNotification = useNotification();

  const handleClick = () => {
    toggleNotification({ ...defaultNotificationConfig, ...notificationConfig });
  };

  return (
    <button type="button" onClick={handleClick}>
      Trigger Notification
    </button>
  );
};

const render = (props) => ({
  user: userEvent.setup({
    advanceTimers: jest.advanceTimersByTime,
  }),
  ...renderRTL(<Component {...props} />, {
    wrapper: ({ children }) => (
      <ThemeProvider theme={lightTheme}>
        <IntlProvider
          locale="en"
          messages={{
            'tests.message': 'react-intl test message',
            'tests.title': 'react-intl test title',
          }}
          defaultLocale="en"
          textComponent="span"
        >
          <NotificationsProvider>{children}</NotificationsProvider>
        </IntlProvider>
      </ThemeProvider>
    ),
  }),
});

describe('Notifications', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('rendering', () => {
    it('should by default it should render a basic notification and only one when triggered, it should disappear after 2500ms', async () => {
      const { user, getByRole, getByText, queryByText, rerender } = render();

      await user.click(getByRole('button', { name: 'Trigger Notification' }));

      expect(getByText(/test/)).toBeInTheDocument();

      jest.advanceTimersByTime(3000);

      expect(queryByText(/test/)).not.toBeInTheDocument();

      rerender(<Component title={{ id: 'tests.title' }} />);

      await user.click(getByRole('button', { name: 'Trigger Notification' }));

      expect(getByText('react-intl test title')).toBeInTheDocument();

      jest.advanceTimersByTime(3000);

      expect(queryByText('react-intl test title')).not.toBeInTheDocument();
    });

    it('should render a link when passed as a prop', async () => {
      const { user, getByRole } = render({
        link: {
          label: 'test-link',
          url: 'https://google.com',
        },
      });

      await user.click(getByRole('button', { name: 'Trigger Notification' }));

      expect(getByRole('link', { name: 'test-link' })).toBeInTheDocument();
    });

    it('should render a message when passed as a prop', async () => {
      const { user, getByRole, getByText, rerender } = render({
        message: 'test-message',
      });

      await user.click(getByRole('button', { name: 'Trigger Notification' }));

      expect(getByText('test-message')).toBeInTheDocument();

      rerender(<Component message={{ id: 'tests.message' }} />);

      await user.click(getByRole('button', { name: 'Trigger Notification' }));

      expect(getByText('react-intl test message')).toBeInTheDocument();
    });
  });

  describe('props', () => {
    it('when `toggleNotification` is called with `blockTransition = true` it should not remove the notification automatically', async () => {
      const { user, getByRole, queryAllByText } = render({ blockTransition: true });

      await user.click(getByRole('button', { name: 'Trigger Notification' }));

      expect(queryAllByText(/test/)).toHaveLength(1);

      jest.advanceTimersByTime(3000);

      expect(queryAllByText(/test/)).toHaveLength(1);

      await user.click(getByRole('button', { name: 'Close' }));

      expect(queryAllByText(/test/)).toHaveLength(0);
    });

    it('should call onClose when the notification is closed', async () => {
      const onClose = jest.fn();
      const { user, getByRole, queryAllByText } = render({ onClose });

      await user.click(getByRole('button', { name: 'Trigger Notification' }));

      expect(queryAllByText(/test/)).toHaveLength(1);

      await user.click(getByRole('button', { name: 'Close' }));

      expect(onClose).toHaveBeenCalled();
    });

    it('should allow you to set a custom timeout for the notification', async () => {
      const { user, getByRole, queryByText, getByText } = render({ timeout: 1000 });

      await user.click(getByRole('button', { name: 'Trigger Notification' }));

      expect(getByText(/test/)).toBeInTheDocument();

      jest.advanceTimersByTime(1001);

      expect(queryByText(/test/)).not.toBeInTheDocument();
    });
  });

  it('should still remove existing notificaitons when a new one is triggered', async () => {
    const { user, getByRole, queryAllByText } = render();

    await user.click(getByRole('button', { name: 'Trigger Notification' }));

    expect(queryAllByText(/test/)).toHaveLength(1);

    jest.advanceTimersByTime(2000);

    await user.click(getByRole('button', { name: 'Trigger Notification' }));

    expect(queryAllByText(/test/)).toHaveLength(2);

    jest.advanceTimersByTime(1000);

    expect(queryAllByText(/test/)).toHaveLength(1);
  });
});
