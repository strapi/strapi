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
    <CustomFieldsContext.Provider value={{ customFields }}>{children}</CustomFieldsContext.Provider>
  );
};

CustomFieldsProvider.propTypes = {
  children: PropTypes.node.isRequired,
  customFields: PropTypes.object.isRequired,
};

export default CustomFieldsProvider;
