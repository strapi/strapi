import React from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import { Padded } from '@buffetjs/core';
import { useGlobalContext } from 'strapi-helper-plugin';
import { useRolesList } from '../../../hooks';
import styles from './utils/styles';
import ClearIndicator from './ClearIndicator';
import DropdownIndicator from './DropdownIndicator';
import ErrorMessage from './ErrorMessage';
import IndicatorSeparator from './IndicatorSeparator';
import MultiValueContainer from './MultiValueContainer';

const SelectRoles = ({ error, isDisabled, name, onChange, value }) => {
  const { formatMessage } = useGlobalContext();
  const translatedError = error && error.id ? formatMessage(error) : null;
  const { roles: data, isLoading } = useRolesList();

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
        isLoading={isLoading}
        isMulti
        options={isLoading ? [] : data}
        styles={styles}
        value={value}
      />
      {error && value.length === 0 ? (
        <ErrorMessage>{translatedError}</ErrorMessage>
      ) : (
        <Padded top size="11px" />
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
