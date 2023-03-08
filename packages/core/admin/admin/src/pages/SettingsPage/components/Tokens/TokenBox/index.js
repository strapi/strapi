import React, { useRef } from 'react';
import { useIntl } from 'react-intl';
import { ContentBox, useNotification, useTracking } from '@strapi/helper-plugin';
import { IconButton } from '@strapi/design-system';
import { Duplicate, Key } from '@strapi/icons';
import PropTypes from 'prop-types';
import { CopyToClipboard } from 'react-copy-to-clipboard';

const TokenBox = ({ token, tokenType }) => {
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const { trackUsage } = useTracking();
  const trackUsageRef = useRef(trackUsage);

  return (
    <ContentBox
      endAction={
        token && (
          <span style={{ alignSelf: 'start' }}>
            <CopyToClipboard
              onCopy={() => {
                trackUsageRef.current('didCopyTokenKey', {
                  tokenType,
                });
                toggleNotification({
                  type: 'success',
                  message: { id: 'Settings.tokens.notification.copied' },
                });
              }}
              text={token}
            >
              <IconButton
                label={formatMessage({
                  id: 'app.component.CopyToClipboard.label',
                  defaultMessage: 'Copy to clipboard',
                })}
                noBorder
                icon={<Duplicate />}
                style={{ padding: 0, height: '1rem' }}
              />
            </CopyToClipboard>
          </span>
        )
      }
      title={
        token ||
        formatMessage({
          id: 'Settings.tokens.copy.editTitle',
          defaultMessage: 'This token isn’t accessible anymore.',
        })
      }
      subtitle={
        token
          ? formatMessage({
              id: 'Settings.tokens.copy.lastWarning',
              defaultMessage: 'Make sure to copy this token, you won’t be able to see it again!',
            })
          : formatMessage({
              id: 'Settings.tokens.copy.editMessage',
              defaultMessage: 'For security reasons, you can only see your token once.',
            })
      }
      icon={<Key />}
      iconBackground="neutral100"
    />
  );
};

TokenBox.defaultProps = {
  token: null,
};

TokenBox.propTypes = {
  token: PropTypes.string,
  tokenType: PropTypes.string.isRequired,
};

export default TokenBox;
