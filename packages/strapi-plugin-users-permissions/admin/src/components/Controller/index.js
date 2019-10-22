/**
 *
 * Controller
 *
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { get, map } from 'lodash';
import { FormattedMessage } from 'react-intl';
import pluginId from '../../pluginId';
import { useEditPageContext } from '../../contexts/EditPage';
import InputCheckbox from '../InputCheckboxPlugin';

import { Header, Label, Separator, Wrapper } from './Components';

function Controller({ actions, inputNamePath, isOpen, name }) {
  const { selectAllActions } = useEditPageContext();
  const [inputSelected, setInputSelected] = useState('');

  const areAllActionsSelected = () => {
    return Object.keys(actions).every(
      action => actions[action].enabled === true
    );
  };

  const handleChange = () => {
    selectAllActions(
      `${inputNamePath}.controllers.${name}`,
      !areAllActionsSelected()
    );
  };

  const hasSomeActionsSelected = () => {
    return Object.keys(actions).some(
      action => actions[action].enabled === true
    );
  };

  const setNewInputSelected = name => {
    setInputSelected(name);
  };

  const labelId = areAllActionsSelected() ? 'unselectAll' : 'selectAll';

  return (
    <Wrapper>
      <Header>
        <div>{name}</div>
        <Separator />
        <div className="checkbox-wrapper">
          <div className="form-check">
            <Label
              className={`form-check-label ${areAllActionsSelected() &&
                'checked'} ${!areAllActionsSelected() &&
                hasSomeActionsSelected() &&
                'some-checked'}`}
              htmlFor={name}
            >
              <input
                className="form-check-input"
                checked={areAllActionsSelected()}
                id={name}
                name={name}
                onChange={handleChange}
                type="checkbox"
              />
              <FormattedMessage id={`${pluginId}.Controller.${labelId}`} />
            </Label>
          </div>
        </div>
      </Header>
      <div className="row">
        {map(Object.keys(actions).sort(), actionKey => (
          <InputCheckbox
            inputSelected={inputSelected}
            isOpen={isOpen}
            key={actionKey}
            label={actionKey}
            name={`${inputNamePath}.controllers.${name}.${actionKey}.enabled`}
            setNewInputSelected={setNewInputSelected}
            value={get(actions[actionKey], 'enabled')}
          />
        ))}
      </div>
    </Wrapper>
  );
}

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
