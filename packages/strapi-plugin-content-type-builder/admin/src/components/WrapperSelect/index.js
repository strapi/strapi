import React from 'react';
import PropTypes from 'prop-types';
import { SelectWrapper, SelectNav } from 'strapi-helper-plugin';
import { ErrorMessage } from '@buffetjs/styles';
import CreatableSelect from '../CreatableSelect';
import ComponentSelect from '../ComponentSelect';

const WrapperSelect = ({ error, label, name, type, ...rest }) => {
  const styles = {
    container: base => ({
      ...base,
      'z-index': 9999,
    }),
    control: (base, state) => ({
      ...base,
      border: state.isFocused
        ? '1px solid #78caff !important'
        : error
        ? '1px solid red !important'
        : '1px solid #E3E9F3 !important',
    }),
    menu: base => {
      return {
        ...base,
        border: '1px solid #78caff !important',
        borderColor: '#78caff !important',
        borderTopColor: '#E3E9F3 !important',
      };
    },
  };

  const Component =
    type === 'creatableSelect' ? CreatableSelect : ComponentSelect;

  return (
    <SelectWrapper className="form-group" style={{ marginBottom: 0 }}>
      <SelectNav>
        <div>
          <label htmlFor={name}>{label}</label>
        </div>
      </SelectNav>
      <Component name={name} {...rest} styles={styles} />

      {error && <ErrorMessage style={{ paddingTop: 9 }}>{error}</ErrorMessage>}
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
