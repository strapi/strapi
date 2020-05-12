import React from 'react';
import PropTypes from 'prop-types';
import { SelectWrapper, SelectNav } from 'strapi-helper-plugin';
import { ErrorMessage } from '@buffetjs/styles';
import AllowedTypesSelect from '../AllowedTypesSelect';
import ComponentSelect from '../ComponentSelect';
import CreatableSelect from '../CreatableSelect';

/* eslint-disable no-nested-ternary */

const WrapperSelect = ({ error, label, name, type, ...rest }) => {
  const styles = {
    container: base => ({
      ...base,
      'z-index': 9999,
      //
      marginTop: '4px !important',
    }),
    control: (base, state) => ({
      ...base,
      border: state.isFocused
        ? '1px solid #78caff !important'
        : error
        ? '1px solid #F64D0A !important'
        : '1px solid #E3E9F3 !important',
      borderRadius: '2px !important',
    }),
    menu: base => {
      return {
        ...base,
        padding: '0 15px',
        border: '1px solid #78caff !important',
        borderColor: '#78caff !important',
        borderTopColor: '#E3E9F3 !important',
      };
    },
    option: (base, state) => {
      return {
        ...base,
        backgroundColor: state.isSelected ? '#fff' : base.backgroundColor,
        color: state.isSelected ? '#007eff' : '#333740',
        fontWeight: state.isSelected ? '600' : '400',
      };
    },
  };

  let Component;

  if (type === 'allowedTypesSelect') {
    Component = AllowedTypesSelect;
  } else if (type === 'creatableSelect') {
    Component = CreatableSelect;
  } else {
    Component = ComponentSelect;
  }

  return (
    <SelectWrapper className="form-group" style={{ marginBottom: 0 }}>
      <SelectNav>
        <div>
          <label htmlFor={name}>{label}</label>
        </div>
      </SelectNav>
      <Component name={name} {...rest} styles={styles} />

      {error && (
        <ErrorMessage style={{ paddingTop: 11, paddingBottom: 0, marginBottom: 12 }}>
          {error}
        </ErrorMessage>
      )}
    </SelectWrapper>
  );
};

WrapperSelect.defaultProps = {
  error: null,
};

WrapperSelect.propTypes = {
  error: PropTypes.string,
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
};

export default WrapperSelect;
