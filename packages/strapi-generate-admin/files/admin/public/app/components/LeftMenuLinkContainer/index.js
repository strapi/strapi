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
    let links = this.props.plugins.valueSeq().map(plugin => <LeftMenuLink key={plugin.id} icon={plugin.icon || 'ion-merge'} label={plugin.name} destination={`/plugins/${plugin.id}`} isActive={this.props.params.plugin === plugin.id}></LeftMenuLink>);

    // Check if the plugins list is empty or not
    if (!links.size) {
      links = <span className={styles.noPluginsInstalled}>No plugins installed yet.</span>;
    }

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
  params: React.PropTypes.object,
};

export default LeftMenuLinkContainer;
