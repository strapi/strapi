/**
*
* EditForm
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';

import Input from 'components/Input';

import styles from './styles.scss';

class EditForm extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.editForm}>
        <div className="row">
          <Input
            label="users-permissions.EditForm.inputToggle.label"
            inputDescription="users-permissions.EditForm.inputToggle.description"
            name="uniqueAccount"
            onChange={this.props.onChange}
            type="toggle"
            value={get(this.props.values, 'uniqueAccount')}
            validations={{}}
          />
        </div>
        <div className={styles.separator} />
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
      </div>

    );
  }
}

EditForm.propTypes = {
  onChange: PropTypes.func.isRequired,
  values: PropTypes.object.isRequired,
};

export default EditForm;
