/**
*
* Plugin
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { Collapse } from 'reactstrap';
import { capitalize, get, isEmpty, map } from 'lodash';
import { FormattedMessage } from 'react-intl';

import Controller from '../Controller';

import styles from './styles.scss';

class Plugin extends React.Component { // eslint-disable-line react/prefer-stateless-function
  state = { collapse: false };

  componentDidMount() {
    // Open the application's permissions section if there are APIs
    if (this.props.name === 'application' && !isEmpty(get(this.props.plugin, 'controllers'))) {
      this.props.changePluginSelected('application');
      this.setState({ collapse: !this.state.collapse });
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.pluginSelected !== this.props.pluginSelected && nextProps.pluginSelected !== this.props.name) {
      this.context.resetShouldDisplayPoliciesHint();
      this.setState({ collapse: false });
    }
  }

  handleClick = () => {
    this.props.changePluginSelected(this.props.name);

    if (!isEmpty(get(this.props.plugin, 'controllers'))) {
      this.setState({ collapse: !this.state.collapse });
    }

    if (this.state.collapse) {
      this.context.resetShouldDisplayPoliciesHint();
    }
  }

  render() {
    const divStyle = this.state.collapse ? { marginBottom: '.4rem' } : {};
    const icon = get(this.props.plugin, ['information', 'logo']);
    const emptyApplication = !isEmpty(get(this.props.plugin, 'controllers'));

    if (!emptyApplication) {
      return <div />;
    }

    return (
      <div className={styles.plugin} style={divStyle}>
        <div className={styles.banner} onClick={this.handleClick}>
          <div>
            {this.props.name !== 'application' && (
              <div className={styles.iconContainer}>
                {icon &&  <img src={icon} alt="icon" />}
              </div>
            )}
            <div className={styles.name}>{this.props.name}</div>
            &nbsp;—&nbsp;
            <div className={styles.description}>
              {this.props.name === 'application' ? (
                <FormattedMessage
                  id="users-permissions.Plugin.permissions.application.description"
                />
              ) : (
                <FormattedMessage
                  id="users-permissions.Plugin.permissions.plugins.description"
                  values={{ name: capitalize(this.props.name) }}
                />
              )}
            </div>
          </div>
          { emptyApplication && <div className={this.state.collapse ? styles.chevronUp : styles.chevronDown}></div> }
        </div>
        <Collapse isOpen={this.state.collapse}>
          <div />
          <div className={styles.controllerContainer}>
            {map(get(this.props.plugin, 'controllers'), (controllerActions, key) => (
              <Controller
                inputNamePath={`permissions.${this.props.name}`}
                isOpen={this.state.collapse}
                key={key}
                name={key}
                actions={controllerActions}
                resetInputBackground={this.state.resetInputBackground}
              />
            ))}
          </div>
        </Collapse>
      </div>
    );
  }
}

Plugin.contextTypes = {
  plugins: PropTypes.object.isRequired,
  resetShouldDisplayPoliciesHint: PropTypes.func.isRequired,
};

Plugin.defaultProps = {
  name: '',
  plugin: {
    description: 'users-permissions.Plugin.permissions.description.empty',
    controllers: {},
    information: {},
  },
};

Plugin.propTypes = {
  changePluginSelected: PropTypes.func.isRequired,
  name: PropTypes.string,
  plugin: PropTypes.shape({
    description: PropTypes.string,
    information: PropTypes.shape({
      logo: PropTypes.string,
    }),
  }),
  pluginSelected: PropTypes.string.isRequired,
};

export default Plugin;
