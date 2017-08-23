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

    // const label = this.props.label.id
    //   ? <FormattedMessage id={this.props.label.id} className={styles.linkLabel} />
    //   : <span className={styles.linkLabel}>{this.props.label}</span>;

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
  icon: React.PropTypes.string,
  label: React.PropTypes.string,
  destination: React.PropTypes.string,
  isActive: React.PropTypes.bool,
  leftMenuSections: React.PropTypes.object,
};

export default LeftMenuLink;
