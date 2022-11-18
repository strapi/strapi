import React, { useRef } from 'react';
import { useIntl } from 'react-intl';
import { ContentBox, useNotification, useTracking } from '@strapi/helper-plugin';
import { IconButton } from '@strapi/design-system';
import Duplicate from '@strapi/icons/Duplicate';
import PropTypes from 'prop-types';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import Key from '@strapi/icons/Key';

const HeaderContentBox = ({ apiToken }) => {
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const { trackUsage } = useTracking();
  const trackUsageRef = useRef(trackUsage);

  return (
    <ContentBox
      endAction={
        apiToken && (
          <span style={{ alignSelf: 'start' }}>
            <CopyToClipboard
              onCopy={() => {
                trackUsageRef.current('didCopyTokenKey');
                toggleNotification({
                  type: 'success',
                  message: { id: 'Settings.apiTokens.notification.copied' },
                });
              }}
              text={apiToken}
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
        apiToken ||
        formatMessage({
          id: 'Settings.apiTokens.copy.editTitle',
          defaultMessage: 'This token isn’t accessible anymore.',
        })
      }
      subtitle={
        apiToken
          ? formatMessage({
              id: 'Settings.apiTokens.copy.lastWarning',
              defaultMessage: 'Make sure to copy this token, you won’t be able to see it again!',
            })
          : formatMessage({
              id: 'Settings.apiTokens.copy.editMessage',
              defaultMessage: 'For security reasons, you can only see your token once.',
            })
      }
      icon={<Key />}
      iconBackground="neutral100"
    />
  );
};

HeaderContentBox.defaultProps = {
  apiToken: null,
};

HeaderContentBox.propTypes = {
  apiToken: PropTypes.string,
};

export default HeaderContentBox;
