/**
*
* HeaderNavLink
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';

import pluginId from '../../pluginId';

import styles from './styles.scss';

/* istanbul ignore next */
function HeaderNavLink({ id, isActive, onClick }) {
  return (
    <div className={cn(isActive && styles.headerNavLink)} onClick={() => onClick(id)}>
      <FormattedMessage id={`${pluginId}.popUpForm.navContainer.${id}`} />
    </div>
  );
}

HeaderNavLink.defaultProps = {
  id: 'base',
  isActive: false,
};

HeaderNavLink.propTypes = {
  id: PropTypes.string,
  isActive: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
};

export default HeaderNavLink;
