/**
*
* LeftMenuLinkContainer
*
*/

import React from 'react';
import LeftMenuSubLink from 'components/LeftMenuSubLink';
import styles from './styles.scss';

class LeftMenuSubLinkContainer extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    // List of links
    let links = this.props.subLinks.map((subLink, i) => (
      <LeftMenuSubLink
        key={i}
        label={subLink.label}
        destination={`/plugins/${subLink.to}`}
        isActive={false}
      />
    ));

    return (
      <ul className={styles.list}>
        {links}
      </ul>
    );
  }
}

LeftMenuSubLinkContainer.propTypes = {
  subLinks: React.PropTypes.array,
};

export default LeftMenuSubLinkContainer;
