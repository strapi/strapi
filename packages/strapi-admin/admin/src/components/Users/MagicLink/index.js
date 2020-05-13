// This component is a work in progress
// It's made to be used when the users API is ready
import React from 'react';
import { Text } from '@buffetjs/core';
import PropTypes from 'prop-types';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import Duplicate from '../../../icons/Duplicate';
import Wrapper from './Wrapper';
import Envelope from './Envelope';

const MagicLink = ({ link }) => {
  const handleCopy = () => {
    strapi.notification.info('notification.link-copied');
  };

  return (
    <Wrapper>
      <div className="icon-wrapper">
        <Envelope />
      </div>
      <div className="text-wrapper">
        <Text fontWeight="semiBold" color="black" fontSize="md" lineHeight="18px">
          {link}
          <CopyToClipboard onCopy={handleCopy} text={link}>
            <Duplicate fill="#8B91A0" className="icon-duplicate" />
          </CopyToClipboard>
        </Text>
        <Text fontWeight="regular" color="grey" fontSize="sm" lineHeight="18px">
          Send this link to the user for him to connect.
        </Text>
      </div>
    </Wrapper>
  );
};

MagicLink.defaultProps = {
  link: 'http://my-app.com/admin/registration?code=1234567827654576856789',
};

MagicLink.propTypes = {
  link: PropTypes.string,
};

export default MagicLink;
