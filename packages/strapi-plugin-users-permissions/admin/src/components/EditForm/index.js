/**
*
* EditForm
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';

import Input from 'components/InputsIndex';

import styles from './styles.scss';

class EditForm extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.editForm}>
        <div className="row">
          <Input
            label={{ id: 'users-permissions.EditForm.inputToggle.label.email' }}
            inputDescription={{ id: 'users-permissions.EditForm.inputToggle.description.email' }}
            name="unique_email"
            onChange={this.props.onChange}
            type="toggle"
            value={get(this.props.values, 'unique_email')}
          />
        </div>
        <div className={styles.separator} />
        {/*}
        <div className="row">
          <Input
            customBootstrapClass="col-md-3"
            label="users-permissions.EditForm.inputSelect.subscriptions.label"
            inputDescription="users-permissions.EditForm.inputSelect.subscriptions.description"
            name="subscriptions"
            onChange={this.props.onChange}
            type="number"
            validations={{}}
            value={get(this.props.values, 'subscriptions')}
          />
          <div className="col-md-3" />
          <Input
            customBootstrapClass="col-md-3"
            label="users-permissions.EditForm.inputSelect.durations.label"
            inputDescription="users-permissions.EditForm.inputSelect.durations.description"
            name="durations"
            onChange={this.props.onChange}
            type="number"
            validations={{}}
            value={get(this.props.values, 'durations')}
          />
        </div>
        <div className={styles.separator} />
        */}
        <div className="row">
          <Input
            label={{ id: 'users-permissions.EditForm.inputToggle.label.sign-up' }}
            inputDescription={{ id: 'users-permissions.EditForm.inputToggle.description.sign-up' }}
            name="allow_register"
            onChange={this.props.onChange}
            type="toggle"
            value={get(this.props.values, 'allow_register')}
          />
        </div>
      </div>
    );
  }
}

EditForm.propTypes = {
  onChange: PropTypes.func.isRequired,
  values: PropTypes.object.isRequired,
};

export default EditForm;
