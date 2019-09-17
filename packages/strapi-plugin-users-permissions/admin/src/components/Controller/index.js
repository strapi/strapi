/**
 *
 * Controller
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { get, map } from 'lodash';
import { FormattedMessage } from 'react-intl';
import pluginId from '../../pluginId';

import InputCheckbox from '../InputCheckboxPlugin';

import { Header, Label, Separator, Wrapper } from './Components';

class Controller extends React.Component {
  state = { inputSelected: '' };

  setNewInputSelected = name => {
    this.setState({ inputSelected: name });
  };

  handleChange = () => {
    this.context.selectAllActions(
      `${this.props.inputNamePath}.controllers.${this.props.name}`,
      !this.areAllActionsSelected()
    );
  };

  hasSomeActionsSelected = () => {
    const { actions } = this.props;

    return Object.keys(actions).some(
      action => actions[action].enabled === true
    );
  };

  areAllActionsSelected = () => {
    const { actions } = this.props;

    return Object.keys(actions).every(
      action => actions[action].enabled === true
    );
  };

  render() {
    const labelId = this.areAllActionsSelected() ? 'unselectAll' : 'selectAll';

    return (
      <Wrapper>
        <Header>
          <div>{this.props.name}</div>
          <Separator />
          <div>
            <div className="checkbox-wrapper">
              <div className="form-check">
                <Label
                  className={`form-check-label ${this.areAllActionsSelected() &&
                    'checked'} ${!this.areAllActionsSelected() &&
                    this.hasSomeActionsSelected() &&
                    'some-checked'}`}
                  htmlFor={this.props.name}
                >
                  <input
                    className="form-check-input"
                    checked={this.areAllActionsSelected()}
                    id={this.props.name}
                    name={this.props.name}
                    onChange={this.handleChange}
                    type="checkbox"
                  />
                  <FormattedMessage id={`${pluginId}.Controller.${labelId}`} />
                </Label>
              </div>
            </div>
          </div>
        </Header>
        <div className="row">
          {map(Object.keys(this.props.actions).sort(), actionKey => (
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
      </Wrapper>
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
