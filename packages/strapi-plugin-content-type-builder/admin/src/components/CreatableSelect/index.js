import React from 'react';
import Creatable from 'react-select/creatable';
import PropTypes from 'prop-types';
import {
  SelectWrapper,
  SelectNav,
  useGlobalContext,
} from 'strapi-helper-plugin';
import useDataManager from '../../hooks/useDataManager';

const CreatableSelect = ({ label, name }) => {
  const { allComponentsCategories } = useDataManager();
  console.log({ label });
  const { formatMessage } = useGlobalContext();
  const handleInputChange = (newValue, actionMeta) => {
    console.log({ actionMeta, newValue });
    console.log(actionMeta);
  };
  const styles = {
    control: (base, state) => ({
      ...base,
      border: state.isFocused
        ? '1px solid #78caff !important'
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
    <SelectWrapper className="form-group">
      <SelectNav>
        <div>
          <label htmlFor={name}>{label}</label>
        </div>
      </SelectNav>
      <Creatable
        isClearable
        onInputChange={handleInputChange}
        styles={styles}
        options={formatOptions()}
        // menuIsOpen
      />
    </SelectWrapper>
  );
};

CreatableSelect.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
};

export default CreatableSelect;
