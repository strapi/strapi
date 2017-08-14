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
    // Generate the list of sections
    const linkSections = this.props.plugins.valueSeq().map(plugin => (
      plugin.get('leftMenuSections').map((leftMenuSection, j) => {
        const sectionlinks = leftMenuSection.get('links').map((sectionLink, k) => (
          <LeftMenuLink
            key={k}
            icon={sectionLink.get('icon') || 'link'}
            label={sectionLink.get('label')}
            destination={`/plugins/${plugin.get('id')}${sectionLink.get('destination')}`}
          />
        ));

        return (
          <div key={j}>
            <p className={styles.title}>{leftMenuSection.get('name')}</p>
            <ul className={styles.list}>
              {sectionlinks}
            </ul>
          </div>
        );
      })
    ));


    // List of links
    let pluginsLinks = this.props.plugins.valueSeq().map((plugin) => (
      <LeftMenuLink
        key={plugin.get('id')}
        icon={plugin.get('icon') || 'plug'}
        label={plugin.get('name')}
        destination={`/plugins/${plugin.get('id')}`}
      />
    ));

    // Check if the plugins list is empty or not
    if (!pluginsLinks.size) {
      pluginsLinks = <span className={styles.noPluginsInstalled}>No plugins installed yet.</span>;
    }

    return (
      <div className={styles.leftMenuLinkContainer}>
        {linkSections}
        <div>
          <p className={styles.title}>Plugins</p>
          <ul className={styles.list}>
            {pluginsLinks}
          </ul>
        </div>
        <div>
          <p className={styles.title}>General</p>
          <ul className={styles.list}>
            <LeftMenuLink
              icon="cubes"
              label="List plugins"
              destination="/list-plugins"
            />
            <LeftMenuLink
              icon="download"
              label="Install new plugin"
              destination="/install-plugin"
            />
            <LeftMenuLink
              icon="gear"
              label="Configuration"
              destination="/configuration"
            />
          </ul>
        </div>
      </div>
    );
  }
}

LeftMenuLinkContainer.propTypes = {
  plugins: React.PropTypes.object,
  params: React.PropTypes.object,
};

export default LeftMenuLinkContainer;
