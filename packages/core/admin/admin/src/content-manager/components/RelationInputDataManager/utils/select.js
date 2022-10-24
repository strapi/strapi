import { useMemo } from 'react';
import get from 'lodash/get';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';

import { getRequestUrl } from '../../../utils';

function useSelect({
  componentUid,
  isUserAllowedToEditField,
  isUserAllowedToReadField,
  name,
  queryInfos,
}) {
  const {
    isCreatingEntry,
    createActionAllowedFields,
    readActionAllowedFields,
    updateActionAllowedFields,
    slug,
    initialData,
  } = useCMEditViewDataManager();

  const isFieldAllowed = useMemo(() => {
    if (isUserAllowedToEditField === true) {
      return true;
    }

    const allowedFields = isCreatingEntry ? createActionAllowedFields : updateActionAllowedFields;

    return allowedFields.includes(name);
  }, [
    isCreatingEntry,
    createActionAllowedFields,
    name,
    isUserAllowedToEditField,
    updateActionAllowedFields,
  ]);

  const isFieldReadable = useMemo(() => {
    if (isUserAllowedToReadField) {
      return true;
    }

    const allowedFields = isCreatingEntry ? [] : readActionAllowedFields;

    return allowedFields.includes(name);
  }, [isCreatingEntry, isUserAllowedToReadField, name, readActionAllowedFields]);

  const fieldNameKeys = name.split('.');
  let componentId;

  if (componentUid) {
    componentId = get(initialData, fieldNameKeys.slice(0, -1))?.id;
  }

  // /content-manager/relations/[model]/[id]/[field-name]
  const relationFetchEndpoint = useMemo(() => {
    if (isCreatingEntry) {
      return null;
    }

    if (componentUid) {
      // repeatable components and dz are dynamically created
      // if no componentId exists in initialData it means that the user just created it
      // there then are no relations to request
      return componentId
        ? getRequestUrl(`relations/${componentUid}/${componentId}/${fieldNameKeys.at(-1)}`)
        : null;
    }

    return getRequestUrl(`relations/${slug}/${initialData.id}/${name.split('.').at(-1)}`);
  }, [isCreatingEntry, componentUid, slug, initialData.id, name, componentId, fieldNameKeys]);

  // /content-manager/relations/[model]/[field-name]
  const relationSearchEndpoint = useMemo(() => {
    if (componentUid) {
      return getRequestUrl(`relations/${componentUid}/${name.split('.').at(-1)}`);
    }

    return getRequestUrl(`relations/${slug}/${name.split('.').at(-1)}`);
  }, [componentUid, slug, name]);

  return {
    componentId,
    queryInfos: {
      ...queryInfos,
      endpoints: {
        search: relationSearchEndpoint,
        relation: relationFetchEndpoint,
      },
    },
    isCreatingEntry,
    isFieldAllowed,
    isFieldReadable,
  };
}

export default useSelect;
