/**
*
* WithFormSection
*
*/

import React from 'react';
import InputNumber from 'components/InputNumber';
import InputText from 'components/InputText';
import InputToggle from 'components/InputToggle';
import InputSelect from 'components/InputSelect';
import InputEnum from 'components/InputEnum';
import config from './config.json';



const WithFormSection = (InnerComponent) => class extends React.Component {
  static propTypes = {
    handleChange: React.PropTypes.func.isRequired,
    values: React.PropTypes.object,
  }

  renderInput = (props, key) => {
    const inputs = {
      string: InputText,
      number: InputNumber,
      boolean: InputToggle,
      enum: InputEnum,
      select: InputSelect,
    };
    const Input = inputs[props.type];
    const customBootstrapClass = config[props.target] || '';
    const inputValue = this.props.values[props.target];
    // retrieve options for the select input
    const selectOptions = props.type === 'enum' ? props.items : [];
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
      />
    );
  }
}

export default WithFormSection;
