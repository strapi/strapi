// This component is a work in progress
// It's made to be used when the users API is ready
import React from 'react';
import { Flex, Text } from '@buffetjs/core';
import { Duplicate } from '@buffetjs/icons';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import basename from '../../../utils/basename';
import IconWrapper from './IconWrapper';
import Envelope from './Envelope';
import Wrapper from './Wrapper';

const MagicLink = ({ registrationToken }) => {
  const { formatMessage } = useIntl();
  const handleCopy = () => {
    strapi.notification.info('notification.link-copied');
  };

  const link = `${window.location.origin}${basename}auth/register?registrationToken=${registrationToken}`;

  return (
    <Wrapper>
      <IconWrapper>
        <Envelope />
      </IconWrapper>
      <Flex flexDirection="column" justifyContent="center">
        <Text fontWeight="semiBold" color="black" fontSize="md" lineHeight="18px">
          {link}
          <CopyToClipboard onCopy={handleCopy} text={link}>
            <Duplicate fill="#8B91A0" className="icon-duplicate" />
          </CopyToClipboard>
        </Text>
        <Text fontWeight="regular" color="grey" fontSize="sm" lineHeight="18px">
          {formatMessage({ id: 'app.components.Users.MagicLink.connect' })}
        </Text>
      </Flex>
    </Wrapper>
  );
};

MagicLink.defaultProps = {
  registrationToken: '',
};

MagicLink.propTypes = {
  registrationToken: PropTypes.string,
};

export default MagicLink;
