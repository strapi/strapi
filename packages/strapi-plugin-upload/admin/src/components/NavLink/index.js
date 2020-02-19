/**
 *
 * HeaderNavLink
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import getTrad from '../../utils/getTrad';
import Wrapper from './Wrapper';

const HeaderNavLink = ({ isDisabled, to, isActive, onClick }) => {
  const handleClick = e => {
    if (isDisabled) {
      e.preventDefault();

      return;
    }

    onClick(to);
  };

  return (
    <Wrapper isActive={isActive} isDisabled={isDisabled} onClick={handleClick}>
      <FormattedMessage id={getTrad(`modal.nav.${to}`)} />
    </Wrapper>
  );
};

HeaderNavLink.defaultProps = {
  isActive: false,
  isDisabled: false,
  onClick: () => {},
};

HeaderNavLink.propTypes = {
  to: PropTypes.string.isRequired,
  isActive: PropTypes.bool,
  isDisabled: PropTypes.bool,
  onClick: PropTypes.func,
};

export default HeaderNavLink;
