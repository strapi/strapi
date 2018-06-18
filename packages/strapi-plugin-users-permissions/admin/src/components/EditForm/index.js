/**
*
* EditForm
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import cn from 'classnames';

import LoadingIndicator from 'components/LoadingIndicator';
import Input from 'components/InputsIndex';

import styles from './styles.scss';

class EditForm extends React.Component { // eslint-disable-line react/prefer-stateless-function
  generateSelectOptions = () => (
    Object.keys(get(this.props.values, 'roles', [])).reduce((acc, current) => {
      const option = {
        id: get(this.props.values.roles, [current, 'name']),
        value: get(this.props.values.roles, [current, 'type']),
      };
      acc.push(option);
      return acc;
    }, [])
  )

  render() {
    if (this.props.showLoaders) {
      return (
        <div className={cn(styles.editForm, this.props.showLoaders && styles.loadIndicatorContainer)}>
          <LoadingIndicator />
        </div>
      );
    }
    
    return (
      <div className={styles.editForm}>
        <div className="row">
          <Input
            inputDescription={{ id: 'users-permissions.EditForm.inputSelect.description.role' }}
            inputClassName={styles.inputStyle}
            label={{ id: 'users-permissions.EditForm.inputSelect.label.role' }}
            name="settings.default_role"
            onChange={this.props.onChange}
            selectOptions={this.generateSelectOptions()}
            type="select"
            value={get(this.props.values.settings, 'default_role')}
          />
        </div>
        <div className={styles.separator} />
        <div className="row">
          <Input
            label={{ id: 'users-permissions.EditForm.inputToggle.label.email' }}
            inputDescription={{ id: 'users-permissions.EditForm.inputToggle.description.email' }}
            name="settings.unique_email"
            onChange={this.props.onChange}
            type="toggle"
            value={get(this.props.values.settings, 'unique_email')}
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
            name="settings.allow_register"
            onChange={this.props.onChange}
            type="toggle"
            value={get(this.props.values.settings, 'allow_register')}
          />
        </div>
      </div>
    );
  }
}

EditForm.propTypes = {
  onChange: PropTypes.func.isRequired,
  showLoaders: PropTypes.bool.isRequired,
  values: PropTypes.object.isRequired,
};

export default EditForm;
