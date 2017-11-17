/**
*
* Plugin
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { Collapse } from 'reactstrap';
import { capitalize, get, map } from 'lodash';
import { FormattedMessage } from 'react-intl';

import Controller from 'components/Controller';

import styles from './styles.scss';

class Plugin extends React.Component { // eslint-disable-line react/prefer-stateless-function
  state = { collapse: false };

  componentWillReceiveProps(nextProps) {
    if (nextProps.pluginSelected !== this.props.pluginSelected && nextProps.pluginSelected !== this.props.name) {
      this.setState({ collapse: false });
    }
  }

  handleClick = () => {
    this.props.changePluginSelected(this.props.name);
    this.setState({ collapse: !this.state.collapse });
  }

  render() {
    const divStyle = this.state.collapse ? { marginBottom: '.4rem' } : {};

    return (
      <div className={styles.plugin} style={divStyle}>
        <div className={styles.banner} onClick={this.handleClick}>
          <div>
            <span>{this.props.name}</span>
            &nbsp;—&nbsp;
            <span>
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
            </span>
          </div>
          <div className={this.state.collapse ? styles.chevronUp : styles.chevronDown}>
          </div>
        </div>
        <Collapse isOpen={this.state.collapse}>
          <div />
          <div className={styles.controllerContainer}>
            {map(get(this.props.plugin, 'controllers'), (controllerActions, key) => (
              <Controller
                inputNamePath={`permissions.${this.props.name}`}
                key={key}
                name={key}
                actions={controllerActions}
              />
            ))}
          </div>
        </Collapse>
      </div>
    );
  }
}

Plugin.defaultProps = {
  name: '',
  plugin: {
    description: 'users-permissions.Plugin.permissions.description.empty',
    controllers: {},
  },
};

Plugin.propTypes = {
  changePluginSelected: PropTypes.func.isRequired,
  name: PropTypes.string,
  plugin: PropTypes.shape({
    description: PropTypes.string,
  }),
  pluginSelected: PropTypes.string.isRequired,
};

export default Plugin;
