/**
 *
 * useCustomFields
 *
 */

import { useContext, useRef } from 'react';
import CustomFieldsContext from '../../contexts/CustomFieldsContext';

const useCustomFields = () => {
  const customFields = useContext(CustomFieldsContext);
  // Use a ref so we can safely add the custom fields to a hook dependencies array
  const customFieldsRef = useRef(customFields);

  return customFieldsRef.current;
};

export default useCustomFields;
