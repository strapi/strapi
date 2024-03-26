import * as React from 'react';

import { Alert, AlertVariant, Flex } from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import { MessageDescriptor, useIntl } from 'react-intl';

import { useCallbackRef } from '../hooks/useCallbackRef';
import { TranslationMessage } from '../types';

/**
 * TODO: realistically a lot of this logic is isolated to the `core/admin` package.
 * However, we want to expose the `useNotification` hook to the plugins.
 *
 * Therefore, in V5 we should move this logic back to the `core/admin` package & export
 * the hook from that package and re-export here. For now, let's keep it all together
 * because it's easier to diagnose and we're not using a million refs because we don't
 * understand what's going on.
 */

export interface NotificationLink {
  label: string | MessageDescriptor;
  target?: string;
  url: string;
}

export interface NotificationConfig {
  blockTransition?: boolean;
  link?: NotificationLink;
  message?: string | TranslationMessage;
  onClose?: () => void;
  timeout?: number;
  title?: string | TranslationMessage;
  type?: 'info' | 'warning' | 'softWarning' | 'success';
}

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

export interface NotificationsContextValue {
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

export interface NotificationsProviderProps {
  children: React.ReactNode;
}
export interface Notification extends NotificationConfig {
  id: number;
}

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
        top={`${46 / 16}rem`}
        width={`${500 / 16}rem`}
        zIndex={10}
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

export interface NotificationProps extends Notification {
  clearNotification: (id: number) => void;
}

const Notification = ({
  clearNotification,
  blockTransition = false,
  id,
  link,
  message = {
    id: 'notification.success.saved',
    defaultMessage: 'Saved',
  },
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
  } else if (type === 'warning') {
    // TODO: type should be renamed to danger in the future, but it might introduce changes if done now
    variant = 'danger';
    alertTitle = formatMessage({
      id: 'notification.warning.title',
      defaultMessage: 'Warning:',
    });
  } else if (type === 'softWarning') {
    // TODO: type should be renamed to just warning in the future
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
    alertTitle =
      typeof title === 'string'
        ? title
        : formatMessage(
            {
              id: title.id,
              defaultMessage: title.defaultMessage ?? title.id,
            },
            title.values
          );
  }

  return (
    <Alert
      action={
        link ? (
          <Link href={link.url} isExternal>
            {formatMessage({
              id: typeof link.label === 'object' ? link.label.id : link.label,
              defaultMessage:
                typeof link.label === 'object'
                  ? link.label.defaultMessage ?? link.label.id
                  : link.label,
            })}
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
      {message && typeof message === 'object'
        ? formatMessage(
            {
              id: message.id,
              defaultMessage: message.defaultMessage ?? message.id,
            },
            message.values
          )
        : message}
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
 * import { useNotification } from '@strapi/helper-plugin';
 *
 * const MyComponent = () => {
 *  const toggleNotification = useNotification();
 *
 *  return <button onClick={() => toggleNotification({ message: 'Hello world!' })}>Click me</button>;
 */
const useNotification = () => React.useContext(NotificationsContext).toggleNotification;

export { NotificationsContext, NotificationsProvider, useNotification };
