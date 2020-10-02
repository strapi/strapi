import React from 'react';
import PropTypes from 'prop-types';
import { Text } from '@buffetjs/core';
import { FormattedMessage } from 'react-intl';
import Close from '../../svgs/Close';
import { CloseButton, HeaderWrapper } from './styled';

const Header = ({ title, toggle }) => {
  return (
    <HeaderWrapper toggle={toggle}>
      <Text fontSize="lg" fontWeight="black" style={{ textAlign: 'center' }}>
        <FormattedMessage {...title} />
      </Text>

      <CloseButton>
        <Close />
      </CloseButton>
    </HeaderWrapper>
  );
};

Header.propTypes = {
  title: PropTypes.exact({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
    values: PropTypes.object,
  }).isRequired,
  toggle: PropTypes.func.isRequired,
};

export default Header;
