import React from 'react';

import { IconButton } from '@strapi/design-system';
import { useClipboard, useNotification } from '@strapi/helper-plugin';
import { Link as LinkIcon } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import getTrad from '../../utils/getTrad';

export const CopyLinkButton = ({ url }) => {
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const { copy } = useClipboard();

  const handleClick = async () => {
    const didCopy = await copy(url);

    if (didCopy) {
      toggleNotification({
        type: 'success',
        message: {
          id: 'notification.link-copied',
          defaultMessage: 'Link copied into the clipboard',
        },
      });
    }
  };

  return (
    <IconButton
      label={formatMessage({
        id: getTrad('control-card.copy-link'),
        defaultMessage: 'Copy link',
      })}
      onClick={handleClick}
    >
      <LinkIcon />
    </IconButton>
  );
};

CopyLinkButton.propTypes = {
  url: PropTypes.string.isRequired,
};
