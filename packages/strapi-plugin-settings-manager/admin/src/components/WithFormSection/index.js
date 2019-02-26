/**
*
* WithFormSection
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { findIndex, forEach, has, isObject , join, pullAt, split, includes} from 'lodash';

import InputNumber from '../InputNumber';
import InputText from '../InputText';
import InputToggle from '../InputToggle';
import InputPassword from '../InputPassword';
import InputSelect from '../InputSelect';
import InputEnum from '../InputEnum';
import config from './config.json';
import styles from './styles.scss';

/* eslint-disable react/require-default-props  */
const WithFormSection = (InnerComponent) => class extends React.Component {
  static propTypes = {
    addRequiredInputDesign: PropTypes.bool,
    cancelAction: PropTypes.bool,
    formErrors: PropTypes.array,
    onChange: PropTypes.func,
    section: PropTypes.oneOfType([
      PropTypes.object,
      PropTypes.array,
    ]),
    values: PropTypes.object,
  }

  constructor(props) {
    super(props);
    this.state = {
      hasNestedInput: false,
      showNestedForm: false,
      inputWithNestedForm: '',
    };

    this.inputs = {
      string: InputText,
      password: InputPassword,
      number: InputNumber,
      boolean: InputToggle,
      enum: InputEnum,
      select: InputSelect,
    };
  }

  componentDidMount() {
    // check if there is inside a section an input that requires nested input to display it on the entire line
    if (isObject(this.props.section)) {
      this.checkForNestedForm(this.props);
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.section !== this.props.section || nextProps.cancelAction !== this.props.cancelAction) {
      this.setState({ showNestedForm: false, hasNestedInput: false, inputWithNestedForm: '' });
      if (isObject(nextProps.section)) {
        this.checkForNestedForm(nextProps);
      }
    }
  }

  checkForNestedForm(props) {
    forEach(props.section.items, (input) => {
      if(has(input, 'items')) {
        this.setState({ hasNestedInput: true, inputWithNestedForm: input.target });

        if (props.values[input.target]) {
          this.setState({ showNestedForm: true });
        }
      }
    });
  }

  handleChange = ({ target }) => {
    // display nestedForm if the selected input has a nested form
    if (target.name === this.state.inputWithNestedForm) {
      this.setState({ showNestedForm: target.value });
    }

    this.props.onChange({ target });
  }

  renderInput = (props, key) => {
    const Input = this.inputs[props.type];
    const inputValue = this.props.values[props.target];
    // retrieve options for the select input
    const selectOptions = props.type === 'enum' || props.type === 'select' ? props.items : [];

    // custom check for dynamic keys used for databases
    const dynamicTarget = join(pullAt(split(props.target, '.'),['0', '1', '3', '4']), '.');

    // check if the input has a nested form so it is displayed on the entire line
    const customBootstrapClass = this.state.hasNestedInput ?
      // bootstrap class to make the input displayed on the entire line
      'col-md-6 offset-md-6 mr-md-5' :
      // if the input hasn't a nested form but the config requires him to be displayed differently
      config[props.target] || config[dynamicTarget] || '';

    // custom handleChange props for nested input form
    const handleChange = this.state.hasNestedInput ? this.handleChange :  this.props.onChange;
    let hiddenLabel = includes(props.name, 'enabled');

    if (includes(config.showInputLabel, props.name)) hiddenLabel = false;

    const errorIndex = findIndex(this.props.formErrors, ['target', props.target]);
    const errors = errorIndex !== -1 ? this.props.formErrors[errorIndex].errors : [];

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
        addRequiredInputDesign={this.props.addRequiredInputDesign}
        hiddenLabel={hiddenLabel}
        inputDescription={props.description}
        errors={errors}
      />
    );
  }

  render() {
    return (
      <InnerComponent
        {...this.props}
        showNestedForm={this.state.showNestedForm}
        renderInput={this.renderInput}
        styles={styles}
      />
    );
  }
};

export default WithFormSection;
