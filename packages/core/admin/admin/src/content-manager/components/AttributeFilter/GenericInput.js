import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { DateTime } from '@buffetjs/custom';
import { DatePicker, InputText, InputNumber, Select, TimePicker } from '@buffetjs/core';
import { DateWrapper } from './components';

function GenericInput({ type, onChange, value, ...rest }) {
  switch (type) {
    case 'boolean':
      return <Select onChange={e => onChange(e.target.value)} value={value} {...rest} />;

    case 'date':
    case 'timestamp':
    case 'timestampUpdate': {
      const momentValue = moment(value);

      return (
        <DateWrapper type={type}>
          <DatePicker onChange={e => onChange(e.target.value._d)} value={momentValue} {...rest} />
        </DateWrapper>
      );
    }

    case 'datetime': {
      const momentValue = moment(value);

      return (
        <DateWrapper type={type}>
          <DateTime onChange={e => onChange(e.target.value)} value={momentValue} {...rest} />
        </DateWrapper>
      );
    }
    case 'enumeration':
      return <Select onChange={e => onChange(e.target.value)} value={value} {...rest} />;

    case 'integer':
    case 'decimal':
    case 'float':
      return <InputNumber onChange={e => onChange(e.target.value)} value={value} {...rest} />;

    case 'time':
      return <TimePicker onChange={e => onChange(e.target.value)} value={value} {...rest} />;

    /**
     * "biginteger" type falls into this section
     */
    default:
      return <InputText onChange={e => onChange(e.target.value)} value={value} {...rest} />;
  }
}

GenericInput.defaultProps = {
  value: undefined,
};

GenericInput.propTypes = {
  onChange: PropTypes.func.isRequired,
  type: PropTypes.string.isRequired,
  value: PropTypes.any,
};

export default GenericInput;
