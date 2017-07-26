/**
*
* WithFormSection
*
*/

import React from 'react';
import { forEach, has } from 'lodash';

import InputNumber from 'components/InputNumber';
import InputText from 'components/InputText';
import InputToggle from 'components/InputToggle';
import InputSelect from 'components/InputSelect';
import InputEnum from 'components/InputEnum';
import config from './config.json';
import styles from './styles.scss';


const WithFormSection = (InnerComponent) => class extends React.Component {
  static propTypes = {
    handleChange: React.PropTypes.func.isRequired,
    values: React.PropTypes.object,
  }

  renderInput = (section, props, key) => {
    const inputs = {
      string: InputText,
      number: InputNumber,
      boolean: InputToggle,
      enum: InputEnum,
      select: InputSelect,
    };
    const Input = inputs[props.type];
    let customBootstrapClass = config[props.target] || '';
    const inputValue = this.props.values[props.target];
    // retrieve options for the select input
    const selectOptions = props.type === 'enum' || props.type === 'select' ? props.items : [];

    // check if there is inside a section an input that requires nested input to display it on the entire line
    forEach(section, (items) => {
      forEach(items.items, (item) => {
        customBootstrapClass = has(item, 'items') && items.type === 'enum' ? 'col-md-6 offset-md-6 pull-md-6' : '';
      });
    });

    return (
      <Input
        customBootstrapClass={customBootstrapClass}
        key={key}
        handleChange={this.props.handleChange}
        name={props.name}
        target={props.target}
        isChecked={inputValue}
        selectOptions={selectOptions}
        validations={props.validations}
        value={inputValue}
      />
    );
  }

  render() {
    return (
      <InnerComponent
        {...this.props}
        renderInput={this.renderInput}
        styles={styles}
      />
    );
  }
}

export default WithFormSection;
