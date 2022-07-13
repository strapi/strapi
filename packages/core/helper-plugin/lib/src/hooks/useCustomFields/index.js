/**
 *
 * useCustomFields
 *
 */

import { useContext, useRef } from 'react';
import CustomFieldsContext from '../../contexts/CustomFieldsContext';

const useCustomFields = () => {
  const customFieldsApi = useContext(CustomFieldsContext);
  // Use a ref so we can safely add the custom fields to a hook dependencies array
  const customFieldsApiRef = useRef(customFieldsApi);

  return customFieldsApiRef.current;
};

export default useCustomFields;
