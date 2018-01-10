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

// Utils.
import getQueryParameters from 'utils/getQueryParameters';

// Styles.
import styles from './styles.scss';

class EditForm extends React.Component {
  constructor(props) {
    super(props);
  }

  getInputType = (type = '') => {
    switch (type.toLowerCase()) {
      case 'password':
        return 'password';
      case 'boolean':
        return 'checkbox';
      case 'text':
        return 'textarea';
      case 'email':
        return 'email';
      case 'string':
        return 'text';
      case 'date':
      case 'datetime':
        return 'date';
      case 'float':
      case 'integer':
      case 'bigint':
      case 'decimal':
        return 'number';
      default:
        return 'text';
    }
  }

  render() {
    const source = getQueryParameters(this.props.location.search, 'source');
    const currentSchema = source !== 'content-manager' ? get(this.props.schema, ['plugins', source, this.props.currentModelName]) : get(this.props.schema, [this.props.currentModelName]);
    const currentLayout = get(this.props.layout, [this.props.currentModelName, 'attributes']);

    // Remove `id` field
    const displayedFields = merge(get(currentLayout), omit(currentSchema.fields, 'id'));

    // List fields inputs
    const fields = Object.keys(displayedFields).map((attr, key) => {
      const details = displayedFields[attr];
      const errorIndex = findIndex(this.props.formErrors, ['name', attr]);
      const errors = errorIndex !== -1 ? this.props.formErrors[errorIndex].errors : [];
      const validationsIndex = findIndex(this.props.formValidations, ['name', attr]);
      const validations = get(this.props.formValidations[validationsIndex], 'validations') || {};

      const layout = Object.keys(get(currentLayout, attr, {})).reduce((acc, current) => {
        acc[current] = isFunction(currentLayout[attr][current]) ?
          currentLayout[attr][current](this) :
          currentLayout[attr][current];

        return acc;
      }, {});

      return (
        <Input
          autoFocus={key === 0}
          key={attr}
          type={get(layout, 'type', this.getInputType(details.type))}
          label={get(layout, 'label') || details.label || ''}
          name={attr}
          customBootstrapClass={get(layout, 'className') || ''}
          value={this.props.record.get(attr) || ''}
          placeholder={get(layout, 'placeholder') || details.placeholder || details.label || attr || ''}
          onChange={this.props.onChange}
          validations={get(layout, 'validations') || validations}
          errors={errors}
          didCheckErrors={this.props.didCheckErrors}
          pluginID="content-manager"
        />
      );
    });

    return (
      <form className={styles.form} onSubmit={this.props.onSubmit}>
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
  layout: PropTypes.object.isRequired,
  location: PropTypes.shape({
    search: PropTypes.string,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  record: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.bool,
  ]).isRequired,
  schema: PropTypes.object.isRequired,
};

export default EditForm;
