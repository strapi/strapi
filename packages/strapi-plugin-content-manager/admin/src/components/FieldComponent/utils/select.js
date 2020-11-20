import { useMemo } from 'react';
import { get, take } from 'lodash';
import useDataManager from '../../../hooks/useDataManager';
import { getFieldName } from '../../../utils';
import { useContentTypeLayout } from '../../../hooks';

function useSelect({ isFromDynamicZone, name }) {
  const {
    createActionAllowedFields,
    isCreatingEntry,
    modifiedData,
    removeComponentFromField,
    readActionAllowedFields,
    updateActionAllowedFields,
  } = useDataManager();
  const { contentType } = useContentTypeLayout();

  // This is used for the readonly mode when updating an entry
  const allDynamicZoneFields = useMemo(() => {
    const attributes = get(contentType, ['attributes'], {});

    const dynamicZoneFields = Object.keys(attributes).filter(attrName => {
      return get(attributes, [attrName, 'type'], '') === 'dynamiczone';
    });

    return dynamicZoneFields;
  }, [contentType]);

  const allowedFields = useMemo(() => {
    return isCreatingEntry ? createActionAllowedFields : updateActionAllowedFields;
  }, [isCreatingEntry, createActionAllowedFields, updateActionAllowedFields]);

  const componentValue = get(modifiedData, name, null);
  const compoName = useMemo(() => {
    return getFieldName(name);
  }, [name]);

  const hasChildrenAllowedFields = useMemo(() => {
    if (isFromDynamicZone && isCreatingEntry) {
      return true;
    }

    const includedDynamicZoneFields = allowedFields.filter(name => name === compoName[0]);

    if (includedDynamicZoneFields.length > 0) {
      return true;
    }

    const relatedChildrenAllowedFields = allowedFields
      .map(fieldName => {
        return fieldName.split('.');
      })
      .filter(fieldName => {
        if (fieldName.length < compoName.length) {
          return false;
        }

        const joined = take(fieldName, compoName.length).join('.');

        return joined === compoName.join('.');
      });

    return relatedChildrenAllowedFields.length > 0;
  }, [isFromDynamicZone, isCreatingEntry, allowedFields, compoName]);

  // This is used only when updating an entry
  const hasChildrenReadableFields = useMemo(() => {
    if (isFromDynamicZone) {
      return true;
    }
    if (allDynamicZoneFields.includes(compoName[0])) {
      return true;
    }

    const allowedFields = isCreatingEntry ? [] : readActionAllowedFields;

    const relatedChildrenAllowedFields = allowedFields
      .map(fieldName => {
        return fieldName.split('.');
      })
      .filter(fieldName => {
        if (fieldName.length < compoName.length) {
          return false;
        }

        const joined = take(fieldName, compoName.length).join('.');

        return joined === compoName.join('.');
      });

    return relatedChildrenAllowedFields.length > 0;
  }, [
    isFromDynamicZone,
    allDynamicZoneFields,
    compoName,
    isCreatingEntry,
    readActionAllowedFields,
  ]);

  const isReadOnly = useMemo(() => {
    if (isCreatingEntry) {
      return false;
    }

    if (hasChildrenAllowedFields) {
      return false;
    }

    return hasChildrenReadableFields;
  }, [hasChildrenAllowedFields, hasChildrenReadableFields, isCreatingEntry]);

  return {
    hasChildrenAllowedFields,
    hasChildrenReadableFields,
    isCreatingEntry,
    isReadOnly,
    removeComponentFromField,
    componentValue,
  };
}

export default useSelect;
