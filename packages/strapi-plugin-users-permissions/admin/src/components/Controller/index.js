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

function Controller({ actions, name, inputNamePath }) {
  return (
    <div className={styles.controller}>
      <div className={styles.controllerHeader}>
        <span>{name}</span>
      </div>
      <div className="row">
        {map(Object.keys(actions).sort(), (actionKey) => (
          <InputCheckbox
            key={actionKey}
            name={`${inputNamePath}.controllers.${name}.actions.${actionKey}.enabled`}
            label={actionKey}
            value={get(actions[actionKey], 'enabled')}
          />
        ))}
      </div>
    </div>
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
  name: PropTypes.string,
};

export default Controller;
