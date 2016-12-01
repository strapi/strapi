/**
*
* LeftMenuLink
*
*/

import React from 'react';
import styles from './styles.scss';
import { Link } from 'react-router';

class LeftMenuLink extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <li className={`${styles.leftMenuLink} ${this.props.isActive ? styles.leftMenuLinkActive : ''}`}>
        <Link className={styles.link} to={this.props.destination}>
          <i className={`${styles.linkIcon} ${this.props.icon} ion`}></i>
          <span className={styles.linkLabel}>{this.props.label}</span>
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
};

export default LeftMenuLink;
