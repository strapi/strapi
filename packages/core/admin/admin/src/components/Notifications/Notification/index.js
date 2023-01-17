import React, { useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Alert } from '@strapi/design-system/Alert';
import { Link } from '@strapi/design-system/v2/Link';

const Notification = ({ dispatch, notification }) => {
  const { formatMessage } = useIntl();
  const { message, link, type, id, onClose, timeout, blockTransition } = notification;

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

  if (type === 'info') {
    variant = 'default';
    alertTitle = formatMessage({
      id: 'notification.default.title',
      defaultMessage: 'Information:',
    });
  } else if (type === 'warning') {
    alertTitle = formatMessage({
      id: 'notification.warning.title',
      defaultMessage: 'Warning:',
    });
    variant = 'danger';
  } else {
    alertTitle = formatMessage({
      id: 'notification.success.title',
      defaultMessage: 'Success:',
    });
    variant = 'success';
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
  }),
};

export default Notification;
