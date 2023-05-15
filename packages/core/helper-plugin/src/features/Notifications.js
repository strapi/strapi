import * as React from 'react';

import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Alert, Flex } from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';
import { useCallbackRef } from '../hooks/useCallbackRef';

/**
 * TODO: realistically a lot of this logic is isolated to the `core/admin` package.
 * However, we want to expose the `useNotification` hook to the plugins.
 *
 * Therefore, in V5 we should move this logic back to the `core/admin` package & export
 * the hook from that package and re-export here. For now, let's keep it all together
 * because it's easier to diagnose and we're not using a million refs because we don't
 * understand what's going on.
 */

/**
 * @preserve
 * @typedef {Object} NotificationLink
 * @property {string | import('react-intl').MessageDescriptor} label
 * @property {string | undefined} target
 * @property {string} url
 */

/**
 * @preserve
 * @typedef {Object} NotificationConfig
 * @property {boolean | undefined} blockTransition
 * @property {NotificationLink} link
 * @property {string | import('react-intl').MessageDescriptor | undefined} message
 * @property {() => void | undefined} onClose
 * @property {number | undefined} timeout
 * @property {string | import('react-intl').MessageDescriptor | undefined} title
 * @property {"info" | "warning" | "softWarning" | "success" | undefined} type
 */

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

/**
 * @preserve
 * @typedef {Object} NotificationsContextValue
 * @property {(config: NotificationConfig) => void} toggleNotification – Toggles a notification, wrapped in `useCallback` for a stable identity.
 */

/**
 * @type {React.Context<NotificationsContextValue>}
 */
const NotificationsContext = React.createContext();

/* -------------------------------------------------------------------------------------------------
 * Provider
 * -----------------------------------------------------------------------------------------------*/

const NotificationsProvider = ({ children }) => {
  const notificationIdRef = React.useRef(0);
  const [notifications, setNotifications] = React.useState([]);

  const toggleNotification = React.useCallback(
    ({ type, message, link, timeout, blockTransition, onClose, title }) => {
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

  const clearNotification = React.useCallback((id) => {
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

NotificationsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

const Notification = ({
  id,
  clearNotification,
  message,
  link,
  type,
  onClose,
  timeout,
  blockTransition,
  title,
}) => {
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

  let variant;
  let alertTitle;

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
              id: title?.id || title,
              defaultMessage: title?.defaultMessage || title?.id || title,
            },
            title?.values
          );
  }

  return (
    <Alert
      action={
        link ? (
          <Link href={link.url} isExternal>
            {formatMessage({
              id: link.label?.id || link.label,
              defaultMessage: link.label?.defaultMessage || link.label?.id || link.label,
            })}
          </Link>
        ) : undefined
      }
      onClose={handleClose}
      closeLabel="Close"
      title={alertTitle}
      variant={variant}
    >
      {formatMessage(
        {
          id: message?.id || message,
          defaultMessage: message?.defaultMessage || message?.id || message,
        },
        message?.values
      )}
    </Alert>
  );
};

Notification.defaultProps = {
  blockTransition: false,
  link: undefined,
  onClose: undefined,
  message: {
    id: 'notification.success.saved',
    defaultMessage: 'Saved',
  },
  timeout: 2500,
  title: undefined,
  type: 'success',
};

Notification.propTypes = {
  id: PropTypes.number.isRequired,
  clearNotification: PropTypes.func.isRequired,
  message: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      defaultMessage: PropTypes.string,
      values: PropTypes.object,
    }),
  ]),
  link: PropTypes.shape({
    target: PropTypes.string,
    url: PropTypes.string.isRequired,
    label: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        defaultMessage: PropTypes.string,
        values: PropTypes.object,
      }),
    ]).isRequired,
  }),
  type: PropTypes.string,
  onClose: PropTypes.func,
  timeout: PropTypes.number,
  blockTransition: PropTypes.bool,
  title: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      defaultMessage: PropTypes.string,
      values: PropTypes.object,
    }),
  ]),
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
 * @returns {NotificationsContextValue}
 *
 * @example
 * ```tsx
 * import { useNotification } from '@strapi/helper-plugin';
 *
 * const MyComponent = () => {
 *  const { toggleNotification } = useNotification();
 *
 *  return <button onClick={() => toggleNotification({ message: 'Hello world!' })}>Click me</button>;
 */
const useNotification = () => React.useContext(NotificationsContext).toggleNotification;

export { NotificationsProvider, useNotification, NotificationsContext };
