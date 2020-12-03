import { useCallback, useRef } from 'react';
import { usePermissionsContext } from '../../../../../../admin/src/hooks';
import {
  CONTENT_MANAGER_PREFIX,
  getCreateActionsSizeByContentType,
  getAttributesByModel,
} from '../../../../../../admin/src/components/Roles/Permissions/utils';

const useFillRequiredPermissions = contentType => {
  const { contentTypesPermissions, components, dispatch } = usePermissionsContext();
  const onSelectMultipleAttributesRef = useRef(dispatch);

  const fillRequiredPermissions = useCallback(() => {
    const attributes = getAttributesByModel(contentType, components, '');
    const existingCreatePermissionsSize = getCreateActionsSizeByContentType(
      contentType.uid,
      contentTypesPermissions
    );

    if (existingCreatePermissionsSize === 0 && attributes.length > 0) {
      const requiredAttributes = attributes.filter(attribute => attribute.required);

      onSelectMultipleAttributesRef.current({
        type: 'SELECT_MULTIPLE_ATTRIBUTE',
        shouldEnable: true,
        subject: contentType.uid,
        attributes: requiredAttributes,
        action: `${CONTENT_MANAGER_PREFIX}.create`,
      });
    }
  }, [components, contentType, contentTypesPermissions]);

  return fillRequiredPermissions;
};

export default useFillRequiredPermissions;
