import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import { ErrorMessage } from '@buffetjs/styles';
import { useGlobalContext } from 'strapi-helper-plugin';
import styles from './utils/styles';
import ClearIndicator from './ClearIndicator';
import DropdownIndicator from './DropdownIndicator';
import IndicatorSeparator from './IndicatorSeparator';
import MultiValueContainer from './MultiValueContainer';

const SelectRoles = ({ error, isDisabled, name, onChange, value }) => {
  const [options, setOptions] = useState([]);
  const { formatMessage } = useGlobalContext();
  const translatedError = error ? formatMessage(error) : null;
  const ref = useRef();

  useEffect(() => {
    // TODO
    setOptions([
      { id: 1, name: 'Super Admin' },
      { id: 2, name: 'Author' },
      { id: 3, name: 'Editor' },
      { id: 4, name: 'Soup' },
      { id: 11, name: 'Super Admin1' },
      { id: 21, name: 'Author1' },
      { id: 31, name: 'Editor1' },
      { id: 41, name: 'Soup1' },
    ]);
  }, []);

  return (
    <>
      <Select
        components={{
          ClearIndicator,
          DropdownIndicator,
          IndicatorSeparator,
          MultiValueContainer,
        }}
        error={error}
        getOptionLabel={option => option.name}
        getOptionValue={option => option.id}
        onChange={data => {
          onChange({ target: { name, value: data } });
        }}
        isClearable
        isDisabled={isDisabled}
        isMulti
        options={options}
        styles={styles}
        value={value}
        ref={ref}
      />
      {error && value.length === 0 ? (
        <ErrorMessage style={{ paddingTop: 11, paddingBottom: 0, marginBottom: 17 }}>
          {translatedError}
        </ErrorMessage>
      ) : (
        <div style={{ height: 11 }} />
      )}
    </>
  );
};

SelectRoles.defaultProps = {
  error: null,
  isDisabled: false,
  value: [],
};

SelectRoles.propTypes = {
  error: PropTypes.shape({
    id: PropTypes.string,
  }),
  isDisabled: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.array,
};

export default SelectRoles;
