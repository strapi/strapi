import React from 'react';
import { useIntl } from 'react-intl';
import { ContentBox, toggleNotification } from '@strapi/helper-plugin';
import { IconButton } from '@strapi/design-system/IconButton';
import Duplicate from '@strapi/icons/Duplicate';
import PropTypes from 'prop-types';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import IconApiTokens from '@strapi/icons/IconApiTokens';

const HeaderContentBox = ({ apiToken }) => {
  const { formatMessage } = useIntl();

  return (
    <ContentBox
      endAction={
        apiToken && (
          <CopyToClipboard
            onCopy={() => {
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
            />
          </CopyToClipboard>
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
              defaultMessage: 'For security matters, you can only see your token once.',
            })
      }
      icon={<IconApiTokens />}
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
