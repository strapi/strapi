/**
 *
 * EditForm
 *
 */

import React from 'react';
import { findIndex, get, isEmpty, map } from 'lodash';
import PropTypes from 'prop-types';
import { InputsIndex as Input } from 'strapi-helper-plugin';

import styles from './styles.scss';

class EditForm extends React.Component {
  getProviderForm = () =>
    get(
      this.props.settings,
      ['providers', this.props.selectedProviderIndex, 'auth'],
      {},
    );

  generateSelectOptions = () =>
    Object.keys(get(this.props.settings, 'providers', {})).reduce(
      (acc, current) => {
        const option = {
          id: get(this.props.settings, ['providers', current, 'name']),
          value: get(this.props.settings, ['providers', current, 'provider']),
        };
        acc.push(option);
        return acc;
      },
      [],
    );

  render() {
    return (
      <div className={styles.editForm}>
        <div className="row">
          <Input
            customBootstrapClass="col-md-6"
            inputDescription={{
              id: 'email.EditForm.Input.select.inputDescription',
            }}
            inputClassName={styles.inputStyle}
            label={{ id: 'email.EditForm.Input.select.label' }}
            name="provider"
            onChange={this.props.onChange}
            selectOptions={this.generateSelectOptions()}
            type="select"
            value={get(this.props.modifiedData, 'provider')}
          />
        </div>
        {!isEmpty(this.getProviderForm()) && (
          <div className={styles.subFormWrapper}>
            <div className="row">
              {map(this.getProviderForm(), (value, key) => (
                <Input
                  didCheckErrors={this.props.didCheckErrors}
                  errors={get(this.props.formErrors, [
                    findIndex(this.props.formErrors, ['name', key]),
                    'errors',
                  ])}
                  key={key}
                  label={{ id: value.label }}
                  name={key}
                  onChange={this.props.onChange}
                  selectOptions={value.values}
                  type={value.type === 'enum' ? 'select' : value.type}
                  validations={{ required: true }}
                  value={get(this.props.modifiedData, key, '')}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
}

EditForm.defaultProps = {
  settings: {
    providers: [],
  },
};

EditForm.propTypes = {
  didCheckErrors: PropTypes.bool.isRequired,
  formErrors: PropTypes.array.isRequired,
  modifiedData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  selectedProviderIndex: PropTypes.number.isRequired,
  settings: PropTypes.object,
};

export default EditForm;
