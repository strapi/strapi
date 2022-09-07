import { useMemo } from 'react';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';

import { getRequestUrl } from '../../../utils';

function useSelect({ isUserAllowedToEditField, isUserAllowedToReadField, name, queryInfos }) {
  const {
    isCreatingEntry,
    createActionAllowedFields,
    readActionAllowedFields,
    updateActionAllowedFields,
    slug,
    initialData,
    isSingleType,
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

  // /content-manager/[collection-type]/[content-type]/[id]/[field-name]
  const relationFetchEndpoint = useMemo(() => {
    const collectionTypePrefix = isSingleType ? 'single-types' : 'collection-types';

    if (isCreatingEntry) {
      return null;
    }

    return getRequestUrl(`${collectionTypePrefix}/${slug}/${initialData.id}/${name}`);
  }, [isCreatingEntry, slug, initialData, name, isSingleType]);

  // /content-manager/relations/[content-type]/[field-name]
  const relationSearchEndpoint = useMemo(() => {
    return getRequestUrl(`relations/${slug}/${name}`);
  }, [slug, name]);

  return {
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
