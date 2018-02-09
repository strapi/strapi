/**
*
* Controller
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { get, map, some } from 'lodash';
import cn from 'classnames';
import { FormattedMessage } from 'react-intl';

import InputCheckbox from 'components/InputCheckboxPlugin';
import styles from './styles.scss';

class Controller extends React.Component {
  state = { inputSelected: '', checked: false };

  setNewInputSelected = (name) => {
    this.setState({ inputSelected: name, checked: false });
  }

  handleChange = () => {
    this.setState({ checked: !this.state.checked });
    this.context.selectAllActions(`${this.props.inputNamePath}.controllers.${this.props.name}`, !this.isAllActionsSelected());
  }

  isAllActionsSelected = () => !some(this.props.actions, ['enabled', false]);

  render() {
    return (
      <div className={styles.controller}>
        <div className={styles.controllerHeader}>
          <div>{this.props.name}</div>
          <div className={styles.separator}></div>
          <div>
            <div className={cn(styles.inputCheckbox)}>
              <div className="form-check">
                <label className={cn('form-check-label', styles.label, this.state.checked ? styles.checked : '')} htmlFor={this.props.name}>
                  <input
                    className="form-check-input"
                    checked={this.state.checked}
                    id={this.props.name}
                    name={this.props.name}
                    onChange={this.handleChange}
                    type="checkbox"
                  />
                  <FormattedMessage id="users-permissions.Controller.selectAll" />
                </label>
              </div>
            </div>
          </div>
        </div>
        <div className="row">
          {map(Object.keys(this.props.actions).sort(), (actionKey) => (
            <InputCheckbox
              inputSelected={this.state.inputSelected}
              isOpen={this.props.isOpen}
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

Controller.contextTypes = {
  selectAllActions: PropTypes.func.isRequired,
};

Controller.defaultProps = {
  actions: {},
  inputNamePath: 'permissions.application',
  name: '',
};

Controller.propTypes = {
  actions: PropTypes.object,
  inputNamePath: PropTypes.string,
  isOpen: PropTypes.bool.isRequired,
  name: PropTypes.string,
};

export default Controller;
