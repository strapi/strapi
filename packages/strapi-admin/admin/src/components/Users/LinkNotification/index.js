// This component is a work in progress
// It's made to be used when the users API is ready
import React from 'react';
import { Flex, Text } from '@buffetjs/core';
import { Duplicate } from '@buffetjs/icons';
import PropTypes from 'prop-types';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import IconWrapper from './IconWrapper';
import Envelope from './Envelope';
import Wrapper from './Wrapper';

const LinkNotification = ({ link, description }) => {
  const handleCopy = () => {
    strapi.notification.toggle({ type: 'info', message: { id: 'notification.link-copied' } });
  };

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
          {description}
        </Text>
      </Flex>
    </Wrapper>
  );
};

LinkNotification.defaultProps = {
  link: '',
  description: '',
};

LinkNotification.propTypes = {
  link: PropTypes.string,
  description: PropTypes.string,
};

export default LinkNotification;
