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
    checkForNestedForm: React.PropTypes.bool,
    handleChange: React.PropTypes.func.isRequired,
    section: React.PropTypes.object,
    values: React.PropTypes.object,
  }

  constructor(props) {
    super(props);
    this.state = {
      hasNestedInput: false,
      showNestedForm: false,
      inputWithNestedForm: '',
    };
  }

  handleChange = ({ target }) => {

    // display nestedForm if the selected input has a nested form
    if (target.id === this.state.inputWithNestedForm) {
      this.setState({ showNestedForm: true });
    } else {
      this.setState({ showNestedForm: false });
    }

    this.props.handleChange({ target });
  }

  componentDidMount() {
    // check if there is inside a section an input that requires nested input to display it on the entire line
    if (this.props.checkForNestedForm) {
      forEach(this.props.section.items, (items) => {
        forEach(items, (item) => {
          forEach(item, (input) => {

            if (has(input, 'items')) {
              // store the name of the input that has a nested form
              this.setState({ hasNestedInput: true, inputWithNestedForm: input.name });

              // showNestedForm if the selected input has a nested form
              if (items.value === input.value) {
                this.setState({ showNestedForm: true });
              }
            }
          });
        });
      });
    }
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
    const inputValue = this.props.values[props.target];
    // retrieve options for the select input
    const selectOptions = props.type === 'enum' || props.type === 'select' ? props.items : [];

    // check if the input has a nested form so it is display on the entire line
    const customBootstrapClass = this.state.hasNestedInput ?
      // bootstrap class to make the input display on the entire line
      'col-md-6 offset-md-6 pull-md-6' :
      // if the input hasn't a nested form but the config requires him to be displayed differently
      config[props.target] || '';

    // custom handle change props for nested input form
    const handleChange = this.state.hasNestedInput ? this.handleChange :  this.props.handleChange;
    return (
      <Input
        customBootstrapClass={customBootstrapClass}
        key={key}
        handleChange={handleChange}
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

// Object {name: "form.security.item.xframe.allow-from", value: "ALLOW-FROM", items: Array(1)}
