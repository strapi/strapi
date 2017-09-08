/**
*
* PluginLeftMenuLink
*
*/

import React from 'react';
import { Link } from 'react-router';
import { FormattedMessage } from 'react-intl';
import { isEmpty, findIndex } from 'lodash';
import styles from './styles.scss';

class PluginLeftMenuLink extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.state = {
      environmentIndex: 0,
    }
  }
  componentWillReceiveProps(nextProps) {
    if (nextProps.envParams && nextProps.envParams !== this.props.envParams) {
      const environmentIndex = findIndex(nextProps.environments, ['name', nextProps.envParams]);
      this.setState({ environmentIndex });
    }
  }
  render() {
    let url;

    if (!isEmpty(this.props.environments)) {
      url = this.props.environmentsRequired ?
        `${this.props.link.slug}/${this.props.environments[this.state.environmentIndex].name}`
        : `${this.props.link.slug}`;
    }

    return (
      <li className={styles.pluginLeftMenuLink}>
        <Link className={styles.link} to={`/plugins/settings-manager/${url}`} activeClassName={styles.linkActive}>
          <div>
            <i className={`fa fa-${this.props.link.icon}`} />
          </div>
          <span><FormattedMessage id={`settings-manager.${this.props.link.name}`} /></span>
        </Link>
      </li>
    );
  }
}

PluginLeftMenuLink.propTypes = {
  environments: React.PropTypes.array,
  environmentsRequired: React.PropTypes.bool,
  envParams: React.PropTypes.string,
  link: React.PropTypes.object.isRequired,
};

export default PluginLeftMenuLink;
