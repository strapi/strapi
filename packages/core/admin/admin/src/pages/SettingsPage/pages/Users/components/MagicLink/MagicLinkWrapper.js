import React from 'react';
import PropTypes from 'prop-types';
import { IconButton } from '@strapi/design-system';
import { useNotification, ContentBox } from '@strapi/helper-plugin';
import Duplicate from '@strapi/icons/Duplicate';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { useIntl } from 'react-intl';

// FIXME replace with parts when ready
const Envelope = () => (
  <svg xmlns="http://www.w3.org/2000/svg">
    <text
      transform="translate(-23 -9)"
      fill="#4B515A"
      fillRule="evenodd"
      fontSize="32"
      fontFamily="AppleColorEmoji, Apple Color Emoji"
    >
      <tspan x="23" y="36">
        ✉️
      </tspan>
    </text>
  </svg>
);

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
      icon={<Envelope />}
      iconBackground="neutral100"
    />
  );
};

MagicLinkWrapper.propTypes = {
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.string]).isRequired,
  target: PropTypes.string.isRequired,
};

export default MagicLinkWrapper;
