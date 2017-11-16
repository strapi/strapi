/**
*
* Plugin
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { Collapse } from 'reactstrap';
import { get, map } from 'lodash';
import { FormattedMessage } from 'react-intl';

import Controller from 'components/Controller';

import styles from './styles.scss';

class Plugin extends React.Component { // eslint-disable-line react/prefer-stateless-function
  state = { collapse: false };

  handleClick = () => this.setState({ collapse: !this.state.collapse });

  render() {
    return (
      <div className={styles.plugin}>
        <div className={styles.banner} onClick={this.handleClick}>
          <div>
            <span>{this.props.name}</span>
            &nbsp;—&nbsp;
            <span><FormattedMessage id={get(this.props.plugin, 'description')} /></span>
          </div>
          <div className={this.state.collapse ? styles.chevronUp : styles.chevronDown}>
          </div>
        </div>
        <Collapse isOpen={this.state.collapse}>
          {map(get(this.props.plugin, 'controllers'), (controllerActions, key) => (
            <Controller
              inputNamePath={`permissions.${this.props.name}`}
              key={key}
              name={key}
              actions={get(controllerActions, 'actions')}
            />
          ))}
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
  name: PropTypes.string,
  plugin: PropTypes.shape({
    description: PropTypes.string,
  }),
};

export default Plugin;
