/**
*
* LeftMenuLink
*
*/

import React from 'react';
import styles from './styles.scss';

class LeftMenuLink extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <li className={styles.leftMenuLink}>
        <a className={styles.link} href={this.props.destination}>
          <i className={`${styles.linkIcon} ${this.props.icon} ion`}></i>
          <span className={styles.linkLabel}>{this.props.label}</span>
        </a>
      </li>
    );
  }
}

LeftMenuLink.propTypes = {
  icon: React.PropTypes.string,
  label: React.PropTypes.string,
  destination: React.PropTypes.string,
};

export default LeftMenuLink;
