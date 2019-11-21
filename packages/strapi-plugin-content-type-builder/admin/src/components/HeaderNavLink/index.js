/**
 *
 * HeaderNavLink
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import pluginId from '../../pluginId';
import Wrapper from './Wrapper';

/* istanbul ignore next */
function HeaderNavLink({ custom, id, isActive, onClick }) {
  return (
    <Wrapper
      isActive={isActive}
      style={{ cursor: 'pointer' }}
      onClick={() => onClick(id)}
    >
      <FormattedMessage
        id={`${pluginId}.popUpForm.navContainer.${custom || id}`}
      />
    </Wrapper>
  );
}

HeaderNavLink.defaultProps = {
  custom: null,
  id: 'base',
  isActive: false,
};

HeaderNavLink.propTypes = {
  custom: PropTypes.string,
  id: PropTypes.string,
  isActive: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
};

export default HeaderNavLink;
