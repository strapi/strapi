import * as React from 'react';

import { Alert, AlertVariant, useCallbackRef, Link, Box } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { Toaster, toast } from 'sonner';

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

/**
 * @internal
 * @description exposes the `NotificationsContext` to its children and renders notifications
 */
const NotificationsProvider = ({ children }: { children: React.ReactNode }) => {
  const toggleNotification = React.useCallback(
    ({ type, message, link, timeout, blockTransition, onClose, title }: NotificationConfig) => {
      toast.custom(
        (id) => {
          return (
            <Box width="50rem" maxWidth="100vw" paddingLeft={4} paddingRight={4}>
              <Notification
                type={type}
                message={message}
                title={title}
                link={link}
                clearNotification={() => {
                  toast.dismiss(id);
                  onClose?.();
                }}
              />
            </Box>
          );
        },
        { duration: blockTransition ? Infinity : timeout }
      );
    },
    []
  );

  const value = React.useMemo(() => ({ toggleNotification }), [toggleNotification]);

  return (
    <>
      <Toaster position="top-center" offset={HEIGHT_TOP_NAVIGATION} />
      <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
    </>
  );
};

interface NotificationProps extends NotificationConfig {
  clearNotification: () => void;
}

const Notification = ({
  clearNotification,
  link,
  message,
  onClose,
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

    clearNotification();
  }, [clearNotification, onCloseCallback]);

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
