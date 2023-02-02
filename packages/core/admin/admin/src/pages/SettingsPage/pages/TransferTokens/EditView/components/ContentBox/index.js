import React, { useRef } from 'react';
import { useIntl } from 'react-intl';
import { ContentBox, useNotification, useTracking } from '@strapi/helper-plugin';
import { IconButton } from '@strapi/design-system/IconButton';
import Duplicate from '@strapi/icons/Duplicate';
import PropTypes from 'prop-types';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import Key from '@strapi/icons/Key';

const HeaderContentBox = ({ transferToken }) => {
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const { trackUsage } = useTracking();
  const trackUsageRef = useRef(trackUsage);

  return (
    <ContentBox
      endAction={
        transferToken && (
          <span style={{ alignSelf: 'start' }}>
            <CopyToClipboard
              onCopy={() => {
                trackUsageRef.current('didCopyTokenKey');
                toggleNotification({
                  type: 'success',
                  message: { id: 'Settings.transferTokens.notification.copied' },
                });
              }}
              text={transferToken}
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
        transferToken ||
        formatMessage({
          id: 'Settings.transferTokens.copy.editTitle',
          defaultMessage: 'This token isn’t accessible anymore.',
        })
      }
      subtitle={
        transferToken
          ? formatMessage({
              id: 'Settings.transferTokens.copy.lastWarning',
              defaultMessage: 'Make sure to copy this token, you won’t be able to see it again!',
            })
          : formatMessage({
              id: 'Settings.transferTokens.copy.editMessage',
              defaultMessage: 'For security reasons, you can only see your token once.',
            })
      }
      icon={<Key />}
      iconBackground="neutral100"
    />
  );
};

HeaderContentBox.defaultProps = {
  transferToken: null,
};

HeaderContentBox.propTypes = {
  transferToken: PropTypes.string,
};

export default HeaderContentBox;
