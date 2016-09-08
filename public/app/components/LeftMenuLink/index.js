/**
*
* LeftMenuLink
*
*/

import React from 'react';

import styles from './styles.css';

class LeftMenuLink extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <li className={styles.leftMenuLink}><a className={styles.leftMenuLinkDestination} href>{this.props.label}</a></li>
    );
  }
}

export default LeftMenuLink;

LeftMenuLink.propTypes = {
  label: React.PropTypes.string,
  value: React.PropTypes.string,
};
