import React, { useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Alert } from '@strapi/design-system';
import { Link } from '@strapi/design-system/v2';

const Notification = ({ dispatch, notification }) => {
  const { formatMessage } = useIntl();
  const { message, link, type, id, onClose, timeout, blockTransition, title } = notification;

  const formattedMessage = (msg) =>
    typeof msg === 'string' ? msg : formatMessage(msg, msg.values);
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    }

    dispatch({
      type: 'HIDE_NOTIFICATION',
      id,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    let timeoutToClear;

    if (!blockTransition) {
      timeoutToClear = setTimeout(() => {
        handleClose();
      }, timeout || 2500);
    }

    return () => clearTimeout(timeoutToClear);
  }, [blockTransition, handleClose, timeout]);

  let variant;
  let alertTitle;

  // TODO break out this logic into separate file
  if (type === 'info') {
    variant = 'default';
    alertTitle = formatMessage({
      id: 'notification.default.title',
      defaultMessage: 'Information:',
    });
  } else if (type === 'warning') {
    // type should be renamed to danger in the future, but it might introduce changes if done now
    variant = 'danger';
    alertTitle = formatMessage({
      id: 'notification.warning.title',
      defaultMessage: 'Warning:',
    });
  } else if (type === 'softWarning') {
    // type should be renamed to just warning in the future
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
        : formattedMessage({
            id: title?.id || title,
            defaultMessage: title?.defaultMessage || title?.id || title,
            values: title?.values,
          });
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
      {formattedMessage({
        id: message?.id || message,
        defaultMessage: message?.defaultMessage || message?.id || message,
        values: message?.values,
      })}
    </Alert>
  );
};

Notification.defaultProps = {
  notification: {
    id: 1,
    type: 'success',
    message: {
      id: 'notification.success.saved',
      defaultMessage: 'Saved',
    },
    onClose: () => null,
    timeout: 2500,
    blockTransition: false,
  },
};

Notification.propTypes = {
  dispatch: PropTypes.func.isRequired,
  notification: PropTypes.shape({
    id: PropTypes.number,
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
  }),
};

export default Notification;
