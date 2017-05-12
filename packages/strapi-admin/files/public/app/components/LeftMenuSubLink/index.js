/**
*
* LeftMenuLink
*
*/

import React from 'react';
import styles from './styles.scss';
import { Link } from 'react-router';

class LeftMenuSubLink extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <li className={styles.leftMenuLink}>
        <Link className={styles.link} to={this.props.destination} activeClassName={styles.linkActive}>
          <span className={styles.linkLabel}>{this.props.label}</span>
        </Link>
      </li>
    );
  }
}

LeftMenuSubLink.propTypes = {
  label: React.PropTypes.string,
  destination: React.PropTypes.string,
};

export default LeftMenuSubLink;
