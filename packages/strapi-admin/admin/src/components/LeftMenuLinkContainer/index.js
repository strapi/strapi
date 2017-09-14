/**
 *
 * LeftMenuLinkContainer
 *
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { map } from 'lodash';

import LeftMenuLink from 'components/LeftMenuLink';

import styles from './styles.scss';
import messages from './messages.json';

class LeftMenuLinkContainer extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    // Generate the list of sections
    const linkSections = map(this.props.plugins.toJS(), plugin => (
      plugin.leftMenuSections.map((leftMenuSection, j) => (
        <div key={j}>
          <p className={styles.title}>{leftMenuSection.name}</p>
          <ul className={styles.list}>
            {leftMenuSection.links.map((link, k) =>
              <LeftMenuLink key={k} icon={link.icon || 'link'} label={link.label} destination={`/plugins/${plugin.id}/${link.destination}`} />
            )}
          </ul>
        </div>
      ))
    ));

    // Check if the plugins list is empty or not
    const pluginsLinks = this.props.plugins.size
      ? this.props.plugins.valueSeq().map((plugin) => (
        <LeftMenuLink
          key={plugin.get('id')}
          icon={plugin.get('icon') || 'plug'}
          label={plugin.get('name')}
          destination={`/plugins/${plugin.get('id')}`}
        />
      ))
      : (
        <li className={styles.noPluginsInstalled}>
          <FormattedMessage {...messages.noPluginsInstalled} />.
        </li>
      );

    return (
      <div className={styles.leftMenuLinkContainer}>
        {linkSections}
        <div>
          <p className={styles.title}><FormattedMessage {...messages.plugins} /></p>
          <ul className={styles.list}>
            {pluginsLinks}
          </ul>
        </div>
        <div>
          <p className={styles.title}><FormattedMessage {...messages.general} /></p>
          <ul className={styles.list}>
            <LeftMenuLink
              icon="cubes"
              label={messages.listPlugins.id}
              destination="/list-plugins"
            />
            <LeftMenuLink
              icon="download"
              label={messages.installNewPlugin.id}
              destination="/install-plugin"
            />
            <LeftMenuLink
              icon="gear"
              label={messages.configuration.id}
              destination="/configuration"
            />
          </ul>
        </div>
      </div>
    );
  }
}

LeftMenuLinkContainer.propTypes = {
  plugins: React.PropTypes.object.isRequired,
};

export default LeftMenuLinkContainer;
