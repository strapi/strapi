import React from 'react';
import { useIntl } from 'react-intl';
import { ContentBox, toggleNotification } from '@strapi/helper-plugin';
import { IconButton } from '@strapi/parts/IconButton';
import Duplicate from '@strapi/icons/Duplicate';
import PropTypes from 'prop-types';
import { CopyToClipboard } from 'react-copy-to-clipboard';

const HeaderContentBox = ({ apiToken }) => {
  const { formatMessage } = useIntl();

  return (
    <ContentBox
      endAction={
        apiToken ? (
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
        ) : (
          undefined
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
      icon={
        <svg xmlns="http://www.w3.org/2000/svg">
          <text
            transform="translate(-23 -9)"
            fill="#4B515A"
            fillRule="evenodd"
            fontSize="32"
            fontFamily="AppleColorEmoji, Apple Color Emoji"
          >
            <tspan x="23" y="36">
              🔑
            </tspan>
          </text>
        </svg>
      }
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
