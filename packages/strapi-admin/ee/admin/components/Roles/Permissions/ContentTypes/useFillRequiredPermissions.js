import { useEffect, useRef } from 'react';
import { usePermissionsContext } from '../../../../../../admin/src/hooks';
import { contentManagerPermissionPrefix } from '../../../../../../admin/src/components/Roles/Permissions/utils';

const useFillRequiredPermissions = allContentTypesAttributes => {
  const { onSetAttributesPermissions } = usePermissionsContext();
  const onSetAttributesPermissionsRef = useRef(onSetAttributesPermissions);

  useEffect(() => {
    if (allContentTypesAttributes.length > 0) {
      const requiredAttributes = allContentTypesAttributes.filter(attribute => attribute.required);

      onSetAttributesPermissionsRef.current({
        attributes: requiredAttributes,
        shouldEnable: true,
        action: `${contentManagerPermissionPrefix}.create`,
      });
    }
  }, [allContentTypesAttributes]);
};

export default useFillRequiredPermissions;
