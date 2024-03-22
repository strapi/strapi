import React from 'react';

import { useNotification } from '@strapi/admin/strapi-admin';
import { IconButton } from '@strapi/design-system';
import { Link as LinkIcon } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { useClipboard } from '../../hooks/useClipboard';
import getTrad from '../../utils/getTrad';

export const CopyLinkButton = ({ url }) => {
  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();
  const { copy } = useClipboard();

  const handleClick = async () => {
    const didCopy = await copy(url);

    if (didCopy) {
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: 'notification.link-copied',
          defaultMessage: 'Link copied into the clipboard',
        }),
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
