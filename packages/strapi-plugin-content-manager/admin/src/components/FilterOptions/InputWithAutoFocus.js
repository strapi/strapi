/**
 *
 * InputWithAutoFocus that programatically manage the autofocus of another one
 */

import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';

import InputDate from 'components/InputDate/Loadable';
import InputNumber from 'components/InputNumber/Loadable';
import InputSelect from 'components/InputSelect/Loadable';
import InputText from 'components/InputText/Loadable';

const getInputType = (attrType) => {
  switch (attrType) {
    case 'boolean':
      return InputSelect;
    case 'date':
    case 'datetime':
      return InputDate;
    case 'integer':
    case 'biginteger':
    case 'decimal':
    case 'float':
      return InputNumber;
    default:
      return InputText;
  }
};


class InputWithAutoFocus extends React.Component {
  componentDidMount() {
    if (this.props.filterToFocus === this.props.index) {
      return new Promise(resolve => {
        setTimeout(() => {
          if (this.inputEl.hasOwnProperty('openCalendar')) {
            this.inputEl.openCalendar();
          } else {
            this.inputEl.focus();
          }
          resolve();
        }, 300);
      });
    }
  }

  render() {
    const { filter, inputStyle, name, onChange, schema } = this.props;
    const Input = getInputType(get(schema, [filter.attr, 'type'], 'string'));

    return (
      <Input
        inputRef={input => this.inputEl = input}
        name={name}
        onChange={onChange}
        selectOptions={['true', 'false']}
        style={inputStyle}
        value={get(filter, 'value')}
      />
    );
  }
}

InputWithAutoFocus.defaultProps = {
  filterToFocus: null,
};

InputWithAutoFocus.propTypes = {
  filter: PropTypes.object.isRequired,
  filterToFocus: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.number,
  ]),
  index: PropTypes.number.isRequired,
  inputStyle: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  schema: PropTypes.object.isRequired,
};

export default InputWithAutoFocus;
