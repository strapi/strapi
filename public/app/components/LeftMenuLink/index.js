/**
*
* LeftMenuLink
*
*/

import React from 'react';
import { Link } from 'react-router';

import styles from './styles.css';

class LeftMenuLink extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <li className={styles.leftMenuLink}>
        <Link className={styles.leftMenuLinkDestination} activeClassName={styles.leftMenuLinkDestinationActive} to={`/plugins/settings-manager/${this.props.link.to}`}>{this.props.link.label}
          <i className={`ion ion-arrow-right-c ${styles.leftMenuLinkIcon}`}></i>
        </Link>
      </li>
    );
  }
}

export default LeftMenuLink;

LeftMenuLink.propTypes = {
  link: React.PropTypes.object,
};
