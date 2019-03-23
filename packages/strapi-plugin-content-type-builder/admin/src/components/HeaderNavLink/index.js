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
function HeaderNavLink({ custom, id, isActive, onClick }) {
  return (
    <div
      className={cn(isActive && styles.headerNavLink)}
      style={{ cursor: 'pointer' }}
      onClick={() => onClick(id)}
    >
      <FormattedMessage id={`${pluginId}.popUpForm.navContainer.${custom || id}`} />
    </div>
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
