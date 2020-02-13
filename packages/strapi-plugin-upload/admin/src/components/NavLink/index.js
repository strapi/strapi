/**
 *
 * HeaderNavLink
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import getTrad from '../../utils/getTrad';
// import pluginId from '../../pluginId';
import Wrapper from './Wrapper';

/* istanbul ignore next */
function HeaderNavLink({ isDisabled, to, isActive, onClick }) {
  return (
    <Wrapper
      isActive={isActive}
      style={{ cursor: isDisabled ? 'not-allowed' : 'pointer' }}
      onClick={e => {
        if (isDisabled) {
          e.preventDefault();

          return;
        }
        onClick(to);
      }}
    >
      <FormattedMessage id={getTrad(`modal.nav.${to}`)} />
    </Wrapper>
  );
}

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
