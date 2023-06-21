import React from 'react';

import { IconButton } from '@strapi/design-system';
import { ContentBox, useClipboard, useNotification } from '@strapi/helper-plugin';
import { Duplicate } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

const MagicLinkWrapper = ({ children, target }) => {
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const { copy } = useClipboard();

  const copyLabel = formatMessage({
    id: 'app.component.CopyToClipboard.label',
    defaultMessage: 'Copy to clipboard',
  });

  const handleClick = async () => {
    const didCopy = await copy(target);

    if (didCopy) {
      toggleNotification({ type: 'info', message: { id: 'notification.link-copied' } });
    }
  };

  return (
    <ContentBox
      endAction={
        <IconButton label={copyLabel} noBorder icon={<Duplicate />} onClick={handleClick} />
      }
      title={target}
      titleEllipsis
      subtitle={children}
      icon={<span style={{ fontSize: 32 }}>✉️</span>}
      iconBackground="neutral100"
    />
  );
};

MagicLinkWrapper.propTypes = {
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.string]).isRequired,
  target: PropTypes.string.isRequired,
};

export default MagicLinkWrapper;
