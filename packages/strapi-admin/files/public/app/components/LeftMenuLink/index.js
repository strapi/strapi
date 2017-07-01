/**
*
* LeftMenuLink
*
*/

import React from 'react';
import styles from './styles.scss';
import { Link } from 'react-router';
import LeftMenuSubLinkContainer from 'components/LeftMenuSubLinkContainer';

class LeftMenuLink extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    let subLinksContainer;
    if (this.props.leftMenuLinks && this.props.leftMenuLinks.length) {
      subLinksContainer = <LeftMenuSubLinkContainer subLinks={this.props.leftMenuLinks} />;
    }

    return (
      <li>
        <Link className={`${styles.link} ${this.props.isActive ? styles.linkActive : ''}`} to={this.props.destination}>
          <i className={`${styles.linkIcon} ${this.props.icon} ion`}></i>
          <span className={styles.linkLabel}>{this.props.label}</span>
        </Link>
        {subLinksContainer}
      </li>
    );
  }
}

LeftMenuLink.propTypes = {
  icon: React.PropTypes.string,
  label: React.PropTypes.string,
  destination: React.PropTypes.string,
  isActive: React.PropTypes.bool,
  leftMenuLinks: React.PropTypes.array,
};

export default LeftMenuLink;
