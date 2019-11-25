import React from 'react';
import Creatable from 'react-select/creatable';
import PropTypes from 'prop-types';
import { SelectWrapper, SelectNav } from 'strapi-helper-plugin';
import { ErrorMessage } from '@buffetjs/styles';
import useDataManager from '../../hooks/useDataManager';

const CreatableSelect = ({ error, label, onChange, name }) => {
  const { allComponentsCategories } = useDataManager();

  const handleChange = (inputValue, actionMeta) => {
    const { action } = actionMeta;

    if (action === 'clear') {
      onChange({ target: { name, value: '' } });
    }

    if (action === 'create-option' || action === 'select-option') {
      onChange({ target: { name, value: inputValue.value } });
    }
  };

  const styles = {
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
        borderColor: '#78caff !important',
        borderTopColor: '#E3E9F3 !important',
      };
    },
  };
  const formatOptions = () => {
    return allComponentsCategories.map(cat => ({ value: cat, label: cat }));
  };

  return (
    <SelectWrapper className="form-group" style={{ marginBottom: 0 }}>
      <SelectNav>
        <div>
          <label htmlFor={name}>{label}</label>
        </div>
      </SelectNav>
      <Creatable
        isClearable
        onChange={handleChange}
        styles={styles}
        options={formatOptions()}
      />
      {error && <ErrorMessage style={{ paddingTop: 10 }}>{error}</ErrorMessage>}
    </SelectWrapper>
  );
};

CreatableSelect.defaultProps = {
  error: null,
};

CreatableSelect.propTypes = {
  error: PropTypes.string,
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default CreatableSelect;
