/**
*
* Controller
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { get, map } from 'lodash';

import InputCheckbox from 'components/InputCheckbox';
import styles from './styles.scss';

class Controller extends React.Component {
  state = { inputSelected: '' };

  setNewInputSelected = (name) => this.setState({ inputSelected: name });

  render() {
    return (
      <div className={styles.controller}>
        <div className={styles.controllerHeader}>
          <span>{this.props.name}</span>
        </div>
        <div className="row">
          {map(Object.keys(this.props.actions).sort(), (actionKey) => (
            <InputCheckbox
              inputSelected={this.state.inputSelected}
              key={actionKey}
              label={actionKey}
              name={`${this.props.inputNamePath}.controllers.${this.props.name}.${actionKey}.enabled`}
              setNewInputSelected={this.setNewInputSelected}
              value={get(this.props.actions[actionKey], 'enabled')}
            />
          ))}
        </div>
      </div>
    );
  }
}

Controller.defaultProps = {
  actions: {},
  inputNamePath: 'permissions.application',
  name: '',
};

Controller.propTypes = {
  actions: PropTypes.object,
  inputNamePath: PropTypes.string,
  name: PropTypes.string,
};

export default Controller;
