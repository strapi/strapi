/**
 *
 * CustomFieldsProvider
 *
 */
import React from 'react';
import PropTypes from 'prop-types';
import CustomFieldsContext from '../../contexts/CustomFieldsContext';

const CustomFieldsProvider = ({ children, customFields }) => {
  return (
    <CustomFieldsContext.Provider
      value={{
        get: customFields.get.bind(customFields),
        getAll: customFields.getAll.bind(customFields),
      }}
    >
      {children}
    </CustomFieldsContext.Provider>
  );
};

CustomFieldsProvider.propTypes = {
  children: PropTypes.node.isRequired,
  customFields: PropTypes.shape({
    get: PropTypes.func.isRequired,
    getAll: PropTypes.func.isRequired,
  }).isRequired,
};

export default CustomFieldsProvider;
