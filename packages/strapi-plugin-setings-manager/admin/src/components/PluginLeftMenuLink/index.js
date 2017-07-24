/**
*
* PluginLeftMenuLink
*
*/

import React from 'react';
import { Link } from 'react-router';
import { FormattedMessage } from 'react-intl';
import { includes, isEmpty } from 'lodash';
import styles from './styles.scss';
import config from './config.json';

class PluginLeftMenuLink extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    let url;

    if (!isEmpty(this.props.environments)) {
      url = includes(config.environmentsRequired, this.props.link.slug) ?
        `${this.props.link.slug}/${this.props.environments[0].name}`
        : `${this.props.link.slug}`;
    }
    return (
      <li className={styles.pluginLeftMenuLink}>
        <Link className={styles.link} to={`/plugins/settings-manager/${url}`} activeClassName={styles.linkActive}>
          <i className={`fa fa-${this.props.link.icon}`} />
          <span><FormattedMessage {...{id: this.props.link.name}} /></span>
        </Link>
      </li>
    );
  }
}

PluginLeftMenuLink.propTypes = {
  environments: React.PropTypes.array,
  link: React.PropTypes.object.isRequired,
};

export default PluginLeftMenuLink;
