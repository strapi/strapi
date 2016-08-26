/**
*
* LeftMenuLinkContainer
*
*/

import React from 'react';
import LeftMenuLink from 'components/LeftMenuLink';
import styles from './styles.scss';

class LeftMenuLinkContainer extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    // List of links
    const links = this.props.plugins.map(plugin => <LeftMenuLink icon={plugin.icon || 'ion-person'} label={plugin.name} destination={`/plugins/${plugin.id}`}></LeftMenuLink>);

    return (
      <div className={styles.leftMenuLinkContainer}>
        <p className={styles.title}>Plugins</p>
        <ul className={styles.list}>
          {links}
        </ul>
      </div>
    );
  }
}

LeftMenuLinkContainer.propTypes = {
  plugins: React.PropTypes.object,
};

export default LeftMenuLinkContainer;
