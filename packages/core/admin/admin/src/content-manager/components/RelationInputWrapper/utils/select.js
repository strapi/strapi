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

  const relationFetchEndpoint = useMemo(() => {
    if (isCreatingEntry) {
      return null;
    }

    return getRequestUrl(`${slug}/${initialData.id}/${name}`);
  }, [isCreatingEntry, slug, initialData, name]);

  return {
    queryInfos: {
      ...queryInfos,
      endpoints: {
        ...queryInfos.endpoints,
        relation: relationFetchEndpoint,
      },
    },
    isCreatingEntry,
    isFieldAllowed,
    isFieldReadable,
  };
}

export default useSelect;
