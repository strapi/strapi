import React from 'react';
import { FormattedMessage } from 'react-intl';

const generateOptions = (options, isRequired = false) => [
  <FormattedMessage id="components.InputSelect.option.placeholder" key="__enum_option_null">
    {msg => (
      <option disabled={isRequired} hidden={isRequired} value="">
        {msg}
      </option>
    )}
  </FormattedMessage>,
  ...options.map(v => (
    <option key={v} value={v}>
      {v}
    </option>
  )),
];

export default generateOptions;
