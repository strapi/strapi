import { useCallback, useRef } from 'react';

import { usePermissionsContext } from '../../../../hooks';
import { getCreateActionsSizeByContentType, getAttributesByModel } from '../utils';

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
        subject: contentType.uid,
        attributes: requiredAttributes,
      });
    }
  }, [components, contentType, contentTypesPermissions]);

  return fillRequiredPermissions;
};

export default useFillRequiredPermissions;
