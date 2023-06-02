import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useFormikContext } from 'formik';
import { ComboboxOption, CreatableCombobox } from '@strapi/design-system';

const HTTP_HEADERS = [
  'A-IM',
  'Accept',
  'Accept-Charset',
  'Accept-Encoding',
  'Accept-Language',
  'Accept-Datetime',
  'Access-Control-Request-Method',
  'Access-Control-Request-Headers',
  'Authorization',
  'Cache-Control',
  'Connection',
  'Content-Length',
  'Content-Type',
  'Cookie',
  'Date',
  'Expect',
  'Forwarded',
  'From',
  'Host',
  'If-Match',
  'If-Modified-Since',
  'If-None-Match',
  'If-Range',
  'If-Unmodified-Since',
  'Max-Forwards',
  'Origin',
  'Pragma',
  'Proxy-Authorization',
  'Range',
  'Referer',
  'TE',
  'User-Agent',
  'Upgrade',
  'Via',
  'Warning',
];

const Combobox = ({ name, onChange, value, ...props }) => {
  const {
    values: { headers },
  } = useFormikContext();
  const [options, setOptions] = useState(HTTP_HEADERS);

  useEffect(() => {
    setOptions(
      HTTP_HEADERS.filter(
        (key) => !headers?.some((header) => header.key !== value && header.key === key)
      )
    );
  }, [headers, value]);

  const handleChange = (value) => {
    onChange({ target: { name, value } });
  };

  const handleCreateOption = (value) => {
    setOptions((prev) => [...prev, value]);

    handleChange(value);
  };

  return (
    <CreatableCombobox
      {...props}
      onClear={() => handleChange('')}
      onChange={handleChange}
      onCreateOption={handleCreateOption}
      placeholder=""
      value={value}
    >
      {options.map((key) => (
        <ComboboxOption value={key} key={key}>
          {key}
        </ComboboxOption>
      ))}
    </CreatableCombobox>
  );
};

Combobox.defaultProps = {
  value: undefined,
};

Combobox.propTypes = {
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
};

export default Combobox;
