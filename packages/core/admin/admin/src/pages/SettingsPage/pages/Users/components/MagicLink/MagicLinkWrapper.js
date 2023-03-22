import React from 'react';
import PropTypes from 'prop-types';
import { IconButton } from '@strapi/design-system';
import { useNotification, ContentBox } from '@strapi/helper-plugin';
import { Duplicate } from '@strapi/icons';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { useIntl } from 'react-intl';

const MagicLinkWrapper = ({ children, target }) => {
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();

  const handleCopy = () => {
    toggleNotification({ type: 'info', message: { id: 'notification.link-copied' } });
  };

  const copyLabel = formatMessage({
    id: 'app.component.CopyToClipboard.label',
    defaultMessage: 'Copy to clipboard',
  });

  return (
    <ContentBox
      endAction={
        <CopyToClipboard onCopy={handleCopy} text={target}>
          <IconButton label={copyLabel} noBorder icon={<Duplicate />} />
        </CopyToClipboard>
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
