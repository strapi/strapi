/**
 *
 * EditForm
 *
 */

// Dependencies.
import React from 'react';
import PropTypes from 'prop-types';
import { findIndex, get, omit, isFunction, merge } from 'lodash';

// Components.
import Input from 'components/Input';

// Styles.
import styles from './styles.scss';

class EditForm extends React.Component {
  constructor(props) {
    super(props);
  }

  getInputType = (type = '') => {
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
      case 'float':
      case 'integer':
      case 'bigint':
        return 'number';
      default:
        return 'text';
    }
  }

  render() {
    // Remove `id` field
    const displayedFields = merge(this.props.layout[this.props.currentModelName], omit(this.props.schema[this.props.currentModelName].fields, 'id'));

    // List fields inputs
    const fields = Object.keys(displayedFields).map(attr => {
      const details = displayedFields[attr];
      const errorIndex = findIndex(this.props.formErrors, ['name', attr]);
      const errors = errorIndex !== -1 ? this.props.formErrors[errorIndex].errors : [];
      const validationsIndex = findIndex(this.props.formValidations, ['name', attr]);
      const validations = get(this.props.formValidations[validationsIndex], 'validations') || {};

      const layout = Object.keys(get(this.props.layout[this.props.currentModelName], attr, {})).reduce((acc, current) => {
        acc[current] = isFunction(this.props.layout[this.props.currentModelName][attr][current]) ?
          this.props.layout[this.props.currentModelName][attr][current](this) :
          this.props.layout[this.props.currentModelName][attr][current];

        return acc;
      }, {});

      return (
        <Input
          key={attr}
          type={this.getInputType(details.type)}
          label={get(layout, 'label') || details.label || ''}
          name={attr}
          customBootstrapClass={get(layout, 'className') || ''}
          value={this.props.record.get(attr) || ''}
          placeholder={get(layout, 'placeholder') || details.placeholder || details.label || attr || ''}
          handleChange={this.props.handleChange}
          validations={get(layout, 'validations') || validations}
          errors={errors}
          didCheckErrors={this.props.didCheckErrors}
          pluginID="content-manager"
        />
      );
    });

    return (
      <form className={styles.form} onSubmit={this.props.handleSubmit}>
        <div className='row'>
          {fields}
        </div>
      </form>
    );
  }
}

EditForm.propTypes = {
  currentModelName: PropTypes.string.isRequired,
  didCheckErrors: PropTypes.bool.isRequired,
  formErrors: PropTypes.array.isRequired,
  formValidations: PropTypes.array.isRequired,
  handleChange: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  layout: PropTypes.object.isRequired,
  record: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.bool,
  ]).isRequired,
  schema: PropTypes.object.isRequired,
};

export default EditForm;
