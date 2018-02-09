/**
*
* InputCheckboxWithNestedInputs
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { isEmpty, map, findIndex } from 'lodash';
import { FormattedMessage } from 'react-intl';
import Input from 'components/InputsIndex';
import styles from './styles.scss';

class InputCheckboxWithNestedInputs extends React.Component { // eslint-disable-line react/prefer-stateless-function
  handleChange = () => {
    const target = {
      type: 'checkbox',
      value: !this.props.value[this.props.data.name.split('.')[1]],
      name: this.props.data.name,
    };

    this.props.onChange({ target });

    if (!target.value) {
      const valueToRemove = {
        target: {
          name: `${this.props.data.name}Value`,
          type: 'number',
          value: '',
        },
      };
      this.props.onChange(valueToRemove);
    }
  }

  renderNestedInput = () => {
    if (this.props.value[this.props.data.name.split('.')[1]]) {
      return (
        <div className={styles.nestedInputContainer} style={{ marginBottom: '-19px' }}>
          {map(this.props.data.items, (item, key) => {
            const errorIndex = findIndex(this.props.errors, ['name', item.name]);
            const errors = errorIndex !== -1 ? this.props.errors[errorIndex].errors : [];
            return (
              <Input
                key={key}
                type={item.type}
                onChange={this.props.onChange}
                name={item.name}
                value={this.props.value[item.name.split('.')[1]]}
                validations={item.validations}
                label={item.label}
                errors={errors}
                didCheckErrors={this.props.didCheckErrors}
                pluginId="content-type-builder"
              />
            );
          })}
        </div>
      );
    }
    return <div />;
  }

  render() {
    const spacer = !this.props.data.inputDescription ? <div /> : <div style={{ marginBottom: '.5rem'}}></div>;
    const title = !isEmpty(this.props.data.title) ? <div className={styles.inputTitle}><FormattedMessage id={this.props.data.title} /></div> : '';

    return (
      <div className={`${styles.inputCheckboxWithNestedInputs} col-md-12`}>
        <div className="form-check" style={{ zIndex: '9999' }}>
          {title}
          <FormattedMessage id={this.props.data.label.id}>
            {(message) => (
              <label className={`${styles.checkboxLabel} form-check-label`} htmlFor={this.props.data.name} style={{ cursor: 'pointer' }}>
                <input
                  className="form-check-input"
                  defaultChecked={this.props.value[this.props.data.name.split('.')[1]]}
                  id={this.props.data.name}
                  name={this.props.data.name}
                  onChange={this.handleChange}
                  type="checkbox"
                />
                {message}
              </label>
            )}
          </FormattedMessage>
          <div className={styles.descriptionContainer}>
            <small>{this.props.data.inputDescription}</small>
          </div>
        </div>

        {spacer}
        {this.renderNestedInput()}
      </div>
    );
  }
}

InputCheckboxWithNestedInputs.propTypes = {
  data: PropTypes.object.isRequired,
  didCheckErrors: PropTypes.bool,
  errors: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.object,
};

InputCheckboxWithNestedInputs.defaultProps = {
  didCheckErrors: false,
  errors: [],
  value: {},
};

export default InputCheckboxWithNestedInputs;
