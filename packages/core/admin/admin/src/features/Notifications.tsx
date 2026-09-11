import * as React from 'react';

import { Alert, AlertVariant, Link, Box } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { Toaster, toast } from 'sonner';

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
   * Returns the toast id (sonner's `toast.custom` return value) so a caller that needs to dismiss
   * it later -- e.g. on its own unmount, before the toast's own timeout -- can do so via
   * `dismissNotification` without importing `sonner` itself.
   */
  toggleNotification: (config: NotificationConfig) => string | number | undefined;
  /**
   * Dismisses a previously-toggled notification by the id `toggleNotification` returned. This is
   * the one place `sonner`'s `toast` is used outside `toggleNotification` itself, so callers never
   * need their own `sonner` import. Note: dismissing this way does NOT run the toast's `onClose`
   * -- it is meant for "this is going away regardless of whether anyone acted on it", not for
   * simulating the user closing it.
   */
  dismissNotification: (id: string | number) => void;
}

const NotificationsContext = React.createContext<NotificationsContextValue>({
  toggleNotification: () => undefined,
  dismissNotification: () => {},
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
      return toast.custom(
        (id) => {
          return (
            <Box width="50rem" maxWidth="100%">
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

  const dismissNotification = React.useCallback((id: string | number) => {
    toast.dismiss(id);
  }, []);

  const value = React.useMemo(
    () => ({ toggleNotification, dismissNotification }),
    [toggleNotification, dismissNotification]
  );

  return (
    <>
      <Toaster position="top-center" />
      <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
    </>
  );
};

interface NotificationProps extends Omit<NotificationConfig, 'blockTransition' | 'timeout'> {
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
      onClose={() => {
        onClose?.();
        clearNotification();
      }}
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
