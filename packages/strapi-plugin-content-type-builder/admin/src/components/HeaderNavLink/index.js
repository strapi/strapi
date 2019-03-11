/**
*
* HeaderNavLink
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';

import styles from './styles.scss';

/* istanbul ignore next */
function HeaderNavLink({ id, isActive }) {
  return (
    <div className={cn(isActive && styles.headerNavLink)}>
      <FormattedMessage id={id} />
    </div>
  );
}

HeaderNavLink.defaultProps = {
  isActive: false,
};

HeaderNavLink.propTypes = {
  id: PropTypes.string.isRequired,
  isActive: PropTypes.bool,
};

export default HeaderNavLink;
