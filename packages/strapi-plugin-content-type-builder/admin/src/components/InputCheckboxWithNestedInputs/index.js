/**
*
* InputCheckboxWithNestedInputs
*
*/

import React from 'react';
import { isEmpty, map } from 'lodash';
import { FormattedMessage } from 'react-intl';
import Input from 'components/Input';
import styles from './styles.scss';

class InputCheckboxWithNestedInputs extends React.Component { // eslint-disable-line react/prefer-stateless-function
  handleChange = (e) => {
    const target = {
      type: e.target.type,
      value: !this.props.value[this.props.data.target.split('.')[1]],
      name: e.target.name,
    };
    this.props.handleChange({ target });
  }


  renderNestedInput = () => {
    if (this.props.value[this.props.data.target.split('.')[1]]) {
      return (
        <div className={styles.nestedInputContainer} style={{ marginBottom: '-19px' }}>
          {map(this.props.data.items, (item, key) => (
            <Input
              key={key}
              type={item.type}
              handleChange={this.props.handleChange}
              target={item.target}
              value={this.props.value[item.target.split('.')[1]]}
              validations={item.validations}
              name={item.name}
            />
        ))}
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
          <FormattedMessage id={this.props.data.name}>
            {(message) => (
              <label className={`${styles.checkboxLabel} form-check-label`} htmlFor={this.props.data.name}>
                <input className="form-check-input" type="checkbox" checked={this.props.value[this.props.data.target.split('.')[1]]} onChange={this.handleChange} name={this.props.data.target} />
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
  data: React.PropTypes.object.isRequired,
  handleChange: React.PropTypes.func.isRequired,
  value: React.PropTypes.object,
};

export default InputCheckboxWithNestedInputs;
