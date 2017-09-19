/**
 *
 * EditForm
 *
 */

// Dependencies.
import React from 'react';
import PropTypes from 'prop-types';
import { findIndex, get, omit } from 'lodash';

// Components.
import Input from 'components/Input';

// Styles.
import styles from './styles.scss';

class EditForm extends React.Component {
  constructor(props) {
    super(props);
  }

  getInputType = (type) => {
    switch (type.toLowerCase()) {
      case 'boolean':
        return 'checkbox';
      case 'text':
        return 'textarea';
      case 'string':
        return 'text';
      case 'date':
      case 'datetime':
        return 'date';
      default:
        return 'text';
    }
  }

  render() {
    // Remove `id` field
    const displayedFields = omit(this.props.schema[this.props.currentModelName].fields, 'id');

    // List fields inputs
    const fields = Object.keys(displayedFields).map(attr => {
      const details = displayedFields[attr];
      const errorIndex = findIndex(this.props.formErrors, ['name', attr]);
      const errors = errorIndex !== -1 ? this.props.formErrors[errorIndex].errors : [];
      const validationsIndex = findIndex(this.props.formValidations, ['name', attr]);
      const validations = get(this.props.formValidations[validationsIndex], 'validations') || {};

      return (
        <Input
          key={attr}
          type={this.getInputType(details.type)}
          label={details.label}
          name={attr}
          value={this.props.record.get(attr) || ''}
          placeholder={details.placeholder || details.label || attr || ''}
          handleChange={this.props.handleChange}
          validations={validations}
          errors={errors}
          didCheckErrors={this.props.didCheckErrors}
          pluginID="content-manager"
        />
      );
    });

    return (
      <div>
        <form className={styles.form}>
          {fields}
        </form>
      </div>
    );
  }
}

EditForm.propTypes = {
  currentModelName: PropTypes.string.isRequired,
  didCheckErrors: PropTypes.bool.isRequired,
  formErrors: PropTypes.array.isRequired,
  formValidations: PropTypes.array.isRequired,
  handleChange: PropTypes.func.isRequired,
  record: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.bool,
  ]).isRequired,
  schema: PropTypes.object.isRequired,
};

export default EditForm;
