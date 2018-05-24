/**
 *
 * InputWithAutofocus that programatically manage the autofocus of another one
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
    case 'bigint':
    case 'decimal':
    case 'float':
      return InputNumber;
    default:
      return InputText;
  }
};


class InputWithAutofocus extends React.Component {
  render() {
    const { filter, inputStyle, name, onChange, schema } = this.props;
    const Input = getInputType(get(schema, [filter.attr, 'type'], 'string'));

    return (
      <Input
        name={name}
        onChange={onChange}
        selectOptions={['true', 'false']}
        style={inputStyle}
        value={get(filter, 'value')}
      />
    );
  }
}

InputWithAutofocus.propTypes = {
  filter: PropTypes.object.isRequired,
  inputStyle: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  schema: PropTypes.object.isRequired,
};

export default InputWithAutofocus;
