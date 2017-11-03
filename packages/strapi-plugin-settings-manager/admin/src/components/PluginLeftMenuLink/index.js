/**
*
* PluginLeftMenuLink
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { get, isEmpty, findIndex } from 'lodash';
import styles from './styles.scss';

class PluginLeftMenuLink extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.state = {
      environmentIndex: 0,
    };
  }

  componentDidMount() {
    const environmentIndex = this.props.envParams ? findIndex(this.props.environments, ['name', this.props.envParams]) : 0;
    this.setState({ environmentIndex });
  }

  componentWillReceiveProps(nextProps) {
    if (this.state.environmentIndex === -1 && nextProps.envParams) {
      this.setState({ environmentIndex: findIndex(nextProps.environments, ['name', nextProps.envParams]) });
    }

    if (nextProps.envParams && nextProps.envParams !== this.props.envParams) {
      const environmentIndex = findIndex(nextProps.environments, ['name', nextProps.envParams]);
      this.setState({ environmentIndex });
    }
  }

  render() {
    let url;

    if (!isEmpty(this.props.environments)) {
      url = this.props.environmentsRequired ?
        `${this.props.link.slug}/${get(this.props.environments, [this.state.environmentIndex, 'name'])}`
        : `${this.props.link.slug}`;
    }

    return (
      <li className={styles.pluginLeftMenuLink}>
        <NavLink className={styles.link} to={`/plugins/settings-manager/${url}`} activeClassName={styles.linkActive}>
          <div>
            <i className={`fa fa-${this.props.link.icon}`} />
          </div>
          <span><FormattedMessage id={`settings-manager.${this.props.link.name}`} /></span>
        </NavLink>
      </li>
    );
  }
}

PluginLeftMenuLink.propTypes = {
  environments: PropTypes.array.isRequired,
  environmentsRequired: PropTypes.bool.isRequired,
  envParams: PropTypes.string,
  link: PropTypes.object.isRequired,
};

PluginLeftMenuLink.defaultProps = {
  envParams: '',
};

export default PluginLeftMenuLink;
