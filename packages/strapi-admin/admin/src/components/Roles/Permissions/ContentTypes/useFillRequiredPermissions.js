import { useEffect, useRef } from 'react';
import { usePermissionsContext } from '../../../../hooks';

const useFillRequiredPermissions = allContentTypesAttributes => {
  const { onSetAttributesPermissions } = usePermissionsContext();
  const onSetAttributesPermissionsRef = useRef(onSetAttributesPermissions);

  useEffect(() => {
    if (allContentTypesAttributes.length > 0) {
      const requiredAttributes = allContentTypesAttributes.filter(attribute => attribute.required);

      onSetAttributesPermissionsRef.current({
        attributes: requiredAttributes,
        shouldEnable: true,
      });
    }
  }, [allContentTypesAttributes]);
};

export default useFillRequiredPermissions;
