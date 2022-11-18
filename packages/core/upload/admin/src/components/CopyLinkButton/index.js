import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { IconButton } from '@strapi/design-system';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { useNotification } from '@strapi/helper-plugin';
import LinkIcon from '@strapi/icons/Link';
import getTrad from '../../utils/getTrad';

export const CopyLinkButton = ({ url }) => {
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();

  return (
    <CopyToClipboard
      text={url}
      onCopy={() => {
        toggleNotification({
          type: 'success',
          message: {
            id: 'notification.link-copied',
            defaultMessage: 'Link copied into the clipboard',
          },
        });
      }}
    >
      <IconButton
        label={formatMessage({
          id: getTrad('control-card.copy-link'),
          defaultMessage: 'Copy link',
        })}
        icon={<LinkIcon />}
      />
    </CopyToClipboard>
  );
};

CopyLinkButton.propTypes = {
  url: PropTypes.string.isRequired,
};
