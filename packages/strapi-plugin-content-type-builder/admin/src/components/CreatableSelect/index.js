import React from 'react';
import Creatable from 'react-select/creatable';
import PropTypes from 'prop-types';
import useDataManager from '../../hooks/useDataManager';

const CreatableSelect = ({ onChange, name, styles }) => {
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

  const formatOptions = () => {
    return allComponentsCategories.map(cat => ({ value: cat, label: cat }));
  };

  return (
    <Creatable
      isClearable
      onChange={handleChange}
      styles={styles}
      options={formatOptions()}
    />
  );
};

CreatableSelect.defaultProps = {
  error: null,
};

CreatableSelect.propTypes = {
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  styles: PropTypes.object.isRequired,
};

export default CreatableSelect;
