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
        label={subLink.get('label')}
        destination={`${this.props.destinationPrefix}/${subLink.get('to')}`}
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
  subLinks: React.PropTypes.object,
  destinationPrefix: React.PropTypes.string,
};

export default LeftMenuSubLinkContainer;
