/**
*
* PluginLeftMenuLink
*
*/

import React from 'react';
import { Link } from 'react-router';
import { FormattedMessage } from 'react-intl';
import styles from './styles.scss';

class PluginLeftMenuLink extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <li className={styles.pluginLeftMenuLink}>
        <Link  className={styles.link} to={`/plugins/settings-manager/${this.props.link.slug}`} activeClassName={styles.linkActive}>
          <i className={`fa fa-${this.props.link.icon}`} />
          <span><FormattedMessage {...{id: this.props.link.name}} /></span>
        </Link>
      </li>
    );
  }
}

PluginLeftMenuLink.propTypes = {
  link: React.PropTypes.object.isRequired,
};

export default PluginLeftMenuLink;
