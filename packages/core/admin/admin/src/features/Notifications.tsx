import * as React from 'react';

import { Alert, AlertVariant, Flex, useCallbackRef, Link, Box } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { HEIGHT_TOP_NAVIGATION } from '../constants/theme';

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
        transform="translateX(-50%)"
        position="fixed"
        direction="column"
        alignItems="stretch"
        gap={4}
        marginTop={4}
        top={HEIGHT_TOP_NAVIGATION}
        width="100%"
        maxWidth={`50rem`}
        zIndex="notification"
      >
        {notifications.map((notification) => {
          return (
            <Box key={notification.id} paddingLeft={4} paddingRight={4}>
              <Notification {...notification} clearNotification={clearNotification} />
            </Box>
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

  const getVariant = (): AlertVariant => {
    switch (type) {
      case 'info':
        return 'default';
      case 'danger':
        return 'danger';
      case 'warning':
        return 'warning';
      default:
        return 'success';
    }
  };

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
      title={title}
      variant={getVariant()}
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
