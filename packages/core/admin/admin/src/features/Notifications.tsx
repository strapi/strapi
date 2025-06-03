import * as React from 'react';

import { Alert, AlertVariant, Flex, useCallbackRef, Link } from '@strapi/design-system';
import { useIntl } from 'react-intl';

interface NotificationLink {
  label: string;
  target?: string;
  url: string;
}

interface NotificationConfig {
  blockTransition?: boolean;
  link?: NotificationLink;
  message?: string;
  onClose?: () => void;
  timeout?: number;
  title?: string;
  type?: 'info' | 'warning' | 'danger' | 'success';
}

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

interface NotificationsContextValue {
  /**
   * Toggles a notification, wrapped in `useCallback` for a stable identity.
   */
  toggleNotification: (config: NotificationConfig) => void;
}

const NotificationsContext = React.createContext<NotificationsContextValue>({
  toggleNotification: () => {},
});

/* -------------------------------------------------------------------------------------------------
 * Provider
 * -----------------------------------------------------------------------------------------------*/

interface NotificationsProviderProps {
  children: React.ReactNode;
}
interface Notification extends NotificationConfig {
  id: number;
}

/**
 * @internal
 * @description DO NOT USE. This will be removed before stable release of v5.
 */
const NotificationsProvider = ({ children }: NotificationsProviderProps) => {
  const notificationIdRef = React.useRef(0);

  const [notifications, setNotifications] = React.useState<Notification[]>([]);

  const toggleNotification = React.useCallback(
    ({ type, message, link, timeout, blockTransition, onClose, title }: NotificationConfig) => {
      setNotifications((s) => [
        ...s,
        {
          id: notificationIdRef.current++,
          type,
          message,
          link,
          timeout,
          blockTransition,
          onClose,
          title,
        },
      ]);
    },
    []
  );

  const clearNotification = React.useCallback((id: number) => {
    setNotifications((s) => s.filter((n) => n.id !== id));
  }, []);

  const value = React.useMemo(() => ({ toggleNotification }), [toggleNotification]);

  return (
    <NotificationsContext.Provider value={value}>
      <Flex
        left="50%"
        marginLeft="-250px"
        position="fixed"
        direction="column"
        alignItems="stretch"
        gap={2}
        top={`4.6rem`}
        width={`50rem`}
        zIndex="notification"
      >
        {notifications.map((notification) => {
          return (
            <Notification
              key={notification.id}
              {...notification}
              clearNotification={clearNotification}
            />
          );
        })}
      </Flex>
      {children}
    </NotificationsContext.Provider>
  );
};

interface NotificationProps extends Notification {
  clearNotification: (id: number) => void;
}

const Notification = ({
  clearNotification,
  blockTransition = false,
  id,
  link,
  message,
  onClose,
  timeout = 2500,
  title,
  type,
}: NotificationProps) => {
  const { formatMessage } = useIntl();
  /**
   * Chances are `onClose` won't be classed as stabilised,
   * so we use `useCallbackRef` to avoid make it stable.
   */
  const onCloseCallback = useCallbackRef(onClose);

  const handleClose = React.useCallback(() => {
    onCloseCallback();

    clearNotification(id);
  }, [clearNotification, id, onCloseCallback]);

  // eslint-disable-next-line consistent-return
  React.useEffect(() => {
    if (!blockTransition) {
      const timeoutReference = setTimeout(() => {
        handleClose();
      }, timeout);

      return () => {
        clearTimeout(timeoutReference);
      };
    }
  }, [blockTransition, handleClose, timeout]);

  let variant: AlertVariant;
  let alertTitle: string;

  if (type === 'info') {
    variant = 'default';
    alertTitle = formatMessage({
      id: 'notification.default.title',
      defaultMessage: 'Information:',
    });
  } else if (type === 'danger') {
    variant = 'danger';
    alertTitle = formatMessage({
      id: 'notification.warning.title',
      defaultMessage: 'Warning:',
    });
  } else if (type === 'warning') {
    variant = 'warning';
    alertTitle = formatMessage({
      id: 'notification.warning.title',
      defaultMessage: 'Warning:',
    });
  } else {
    variant = 'success';
    alertTitle = formatMessage({
      id: 'notification.success.title',
      defaultMessage: 'Success:',
    });
  }

  if (title) {
    alertTitle = title;
  }

  return (
    <Alert
      action={
        link ? (
          <Link href={link.url} isExternal>
            {link.label}
          </Link>
        ) : undefined
      }
      onClose={handleClose}
      closeLabel={formatMessage({
        id: 'global.close',
        defaultMessage: 'Close',
      })}
      title={alertTitle}
      variant={variant}
    >
      {message}
    </Alert>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Hook
 * -----------------------------------------------------------------------------------------------*/

/**
 * @preserve
 * @description Returns an object to interact with the notification
 * system. The callbacks are wrapped in `useCallback` for a stable
 * identity.
 *
 * @example
 * ```tsx
 * import { useNotification } from '@strapi/strapi/admin';
 *
 * const MyComponent = () => {
 *  const { toggleNotification } = useNotification();
 *
 *  return <button onClick={() => toggleNotification({ message: 'Hello world!' })}>Click me</button>;
 */
const useNotification = () => React.useContext(NotificationsContext);

export { NotificationsProvider, useNotification };
export type { NotificationConfig, NotificationsContextValue };
