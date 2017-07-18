/**
*
* EditFormSection
*
*/

import React from 'react';
import { map } from 'lodash';
// design
import InputNumber from 'components/InputNumber';
import InputText from 'components/InputText';
import InputToggle from 'components/InputToggle';
import config from './config.json';
import styles from './styles.scss';

class EditFormSection extends React.Component { // eslint-disable-line react/prefer-stateless-function

  renderInput = (props, key) => {
    const inputs = {
      string: InputText,
      number: InputNumber,
      boolean: InputToggle,
    };
    const Input = inputs[props.type];
    const customBootstrapClass = config[props.target] || "";

    return (
      <Input
        customBootstrapClass={customBootstrapClass}
        key={key}
        handleChange={this.props.handleChange}
        name={props.name}
        target={props.target} validations={props.validations}
        value={props.value}
      />
    );
  }

  render() {
    return (
      <div className={styles.editFormSection}>
        <div className="container">
          <div className="row">
            <span>
              {this.props.section.name}
            </span>
            <form>
              {map(this.props.section.items, (item, key) => (
                this.renderInput(item, key)
              ))}
            </form>
          </div>
        </div>
      </div>
    );
  }
}

EditFormSection.propTypes = {
  handleChange: React.PropTypes.func.isRequired,
  section: React.PropTypes.object,
};

export default EditFormSection;
