import React, { useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Padded, Text, Flex } from '@buffetjs/core';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Remove } from '@buffetjs/icons';

import { HIDE_NEW_NOTIFICATION } from '../constants';
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

const Notification = ({ notification }) => {
  const { formatMessage } = useIntl();
  const dispatch = useDispatch();
  const {
    title,
    message,
    link,
    type,
    id,
    onClose,
    timeout,
    blockTransition,
    centered,
  } = notification;

  const formattedMessage = msg => (typeof msg === 'string' ? msg : formatMessage(msg, msg.values));

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    }

    dispatch({
      type: HIDE_NEW_NOTIFICATION,
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

  return (
    <NotificationWrapper centered={centered} color={types[type].color}>
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
                title={formattedMessage(title)}
              >
                {formattedMessage(title)}
              </Text>
            )}
            <Flex justifyContent="space-between">
              {message && (
                <Text title={formattedMessage(message)}>{formattedMessage(message)}</Text>
              )}
              {link && (
                <a
                  href={link.url}
                  target={link.target || '_blank'}
                  rel={!link.target || link.target === '_blank' ? 'noopener noreferrer' : ''}
                >
                  <Padded right left size="xs">
                    <Flex alignItems="center">
                      <Text
                        style={{ maxWidth: '100px' }}
                        ellipsis
                        fontWeight="bold"
                        color="blue"
                        title={formattedMessage(link.label)}
                      >
                        {formattedMessage(link.label)}
                      </Text>
                      {link.target === '_blank' && (
                        <Padded left size="xs">
                          <LinkArrow />
                        </Padded>
                      )}
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
    onClose: () => null,
    timeout: 2500,
    blockTransition: false,
    centered: false,
  },
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
    title: PropTypes.oneOfType([
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
    centered: PropTypes.bool,
  }),
};

export default Notification;
