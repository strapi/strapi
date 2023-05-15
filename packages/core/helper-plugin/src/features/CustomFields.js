import * as React from 'react';

import PropTypes from 'prop-types';

/**
 * @preserve
 * @typedef {Object} CustomField
 * @property {string} name - The name of the custom field
 * @property {string} pluginId - The plugin id of the custom field
 * @property {string} type - The type of the custom field
 * @property {import('react-intl').MessageDescriptor} intlLabel
 * @property {import('react-intl').MessageDescriptor} intlDescription
 * @property {unknown} components
 * @property {unknown} options
 * @property {import('react').ComponentType} icon
 */

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

/**
 * @preserve
 * @typedef {Object} CustomFieldsContextValue
 * @property {(uid: string) => CustomField | undefined} get
 * @property {() => Record<string, CustomField>} getAll
 */

/**
 * @preserve
 * @type {React.Context<CustomFieldsContextValue>}
 */
const CustomFieldsContext = React.createContext({
  get() {},
  getAll() {},
});

/* -------------------------------------------------------------------------------------------------
 * Provider
 * -----------------------------------------------------------------------------------------------*/

const CustomFieldsProvider = ({ children, customFields }) => {
  /**
   * @type {CustomFieldsContextValue['get']}
   */
  const get = customFields.get.bind(customFields);

  /**
   * @type {CustomFieldsContextValue['getAll']}
   */
  const getAll = customFields.getAll.bind(customFields);

  /**
   * @type {CustomFieldsContextValue}
   */
  const value = React.useMemo(() => ({ get, getAll }), [get, getAll]);

  return <CustomFieldsContext.Provider value={value}>{children}</CustomFieldsContext.Provider>;
};

CustomFieldsProvider.propTypes = {
  children: PropTypes.node.isRequired,
  customFields: PropTypes.shape({
    get: PropTypes.func.isRequired,
    getAll: PropTypes.func.isRequired,
  }).isRequired,
};

/* -------------------------------------------------------------------------------------------------
 * Hook
 * -----------------------------------------------------------------------------------------------*/

/**
 * @preserve
 * @returns {CustomFieldsContextValue}
 */
const useCustomFields = () => React.useContext(CustomFieldsContext);

export { CustomFieldsProvider, useCustomFields, CustomFieldsContext };
