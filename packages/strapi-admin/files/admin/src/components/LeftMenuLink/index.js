/**
 *
 * LeftMenuLink
 *
 */

import _ from 'lodash';
import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Link } from 'react-router';

import styles from './styles.scss';

class LeftMenuLink extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    // We need to create our own active url checker,
    // because of the two levels router.
    const isLinkActive = _.startsWith(window.location.pathname.replace('/admin', ''), this.props.destination);

    return (
      <li className={styles.item}>
        <Link className={`${styles.link} ${isLinkActive ? styles.linkActive : ''}`} to={this.props.destination}>
          <i className={`${styles.linkIcon} fa-${this.props.icon} fa`}></i>
          <FormattedMessage id={this.props.label} className={styles.linkLabel} />
        </Link>
      </li>
    );
  }
}

LeftMenuLink.propTypes = {
  destination: React.PropTypes.string.isRequired,
  icon: React.PropTypes.string.isRequired,
  label: React.PropTypes.string.isRequired,
};

export default LeftMenuLink;
