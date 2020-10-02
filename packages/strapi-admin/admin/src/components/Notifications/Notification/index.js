/**
 *
 * Notification
 *
 */
/* eslint-disable */
import React from 'react';
import PropTypes from 'prop-types';
import { Padded, Text, Flex } from '@buffetjs/core';
import { useIntl } from 'react-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Remove } from '@buffetjs/icons';

import { NotificationWrapper, IconWrapper, LinkArrow, RemoveWrapper } from './styledComponents';

const types = {
  success: {
    icon: 'check',
    color: 'green',
  },
  warning: {
    icon: 'exclamation',
    color: 'orange',
  },
  info: {
    icon: 'info',
    color: 'blue',
  },
};

const Notification = ({ notification, onHideNotification }) => {
  const { formatMessage } = useIntl();
  const { title, message, link, type, id, onClose } = notification;

  const formattedMessage = formatMessage(typeof message === 'string' ? { id: message } : message);

  const handleClose = () => {
    if (onClose) {
      onClose();
    }

    onHideNotification(id);
  };

  return (
    <NotificationWrapper color={types[type].color}>
      <Padded top left right bottom size="smd">
        <Flex alignItems="center" justifyContent="space-between">
          <IconWrapper>
            <FontAwesomeIcon icon={types[type].icon} />
          </IconWrapper>
          <Padded left size="sm" style={{ width: '80%', flex: 1 }}>
            {title && (
              <Text
                fontSize="xs"
                textTransform="uppercase"
                color="grey"
                title={formatMessage(title)}
              >
                {formatMessage(title)}
              </Text>
            )}
            <Flex>
              {message && (
                <Text title={formattedMessage} ellipsis>
                  {formattedMessage}
                </Text>
              )}
              {link && (
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  <Padded left size="xs">
                    <Flex alignItems="center">
                      <Text
                        style={{ maxWidth: '120px' }}
                        ellipsis
                        fontWeight="bold"
                        color="blue"
                        title={formatMessage(link.label)}
                      >
                        {formatMessage(link.label)}
                      </Text>
                      <Padded left size="xs" />
                      <LinkArrow />
                    </Flex>
                  </Padded>
                </a>
              )}
            </Flex>
          </Padded>
          <RemoveWrapper>
            <Remove onClick={handleClose} />
          </RemoveWrapper>
        </Flex>
      </Padded>
    </NotificationWrapper>
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
  },
  onClose: () => null,
};

Notification.propTypes = {
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
    title: PropTypes.shape({
      id: PropTypes.string.isRequired,
      defaultMessage: PropTypes.string,
      values: PropTypes.object,
    }),
    link: PropTypes.shape({
      url: PropTypes.string.isRequired,
      label: PropTypes.shape({
        id: PropTypes.string.isRequired,
        defaultMessage: PropTypes.string,
        values: PropTypes.object,
      }).isRequired,
    }),
    type: PropTypes.string,
  }),
  onClose: PropTypes.func,
  onHideNotification: PropTypes.func.isRequired,
};

export default Notification;
