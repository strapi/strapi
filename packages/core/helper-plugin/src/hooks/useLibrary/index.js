/**
 *
 * useLibrary
 *
 */

import { useContext, useRef } from 'react';
import LibraryContext from '../../contexts/LibraryContext';

const useLibrary = () => {
  const { components, fields } = useContext(LibraryContext);
  // Use a ref so we can safely add the components or the fields
  // to a hook dependencies array
  const composRef = useRef(components);
  const fieldsRef = useRef(fields);

  return { components: composRef.current, fields: fieldsRef.current };
};

export default useLibrary;
