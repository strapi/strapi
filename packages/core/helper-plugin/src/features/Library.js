import * as React from 'react';

import PropTypes from 'prop-types';

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

/**
 * @preserve
 * @typedef {Object} LibraryContextValue
 * @property {Record<string, React.ComponentType>} fields
 * @property {Record<string, React.ComponentType>} components
 */

/**
 * @preserve
 * @type {React.Context<LibraryContextValue>} LibraryContext
 */
const LibraryContext = React.createContext();

/* -------------------------------------------------------------------------------------------------
 * Provider
 * -----------------------------------------------------------------------------------------------*/

const LibraryProvider = ({ children, fields, components }) => {
  const value = React.useMemo(() => ({ fields, components }), [fields, components]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
};

LibraryProvider.propTypes = {
  children: PropTypes.node.isRequired,
  components: PropTypes.object.isRequired,
  fields: PropTypes.object.isRequired,
};

/* -------------------------------------------------------------------------------------------------
 * Hook
 * -----------------------------------------------------------------------------------------------*/

/**
 * @preserve
 * @returns {LibraryContextValue}
 */
const useLibrary = () => React.useContext(LibraryContext);

export { LibraryProvider, useLibrary, LibraryContext };
