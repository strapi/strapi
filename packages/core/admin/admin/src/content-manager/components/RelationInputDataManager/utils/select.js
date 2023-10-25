import { useMemo } from 'react';

import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import get from 'lodash/get';
import { useRouteMatch } from 'react-router-dom';

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
    modifiedData,
  } = useCMEditViewDataManager();

  /**
   * This is our cloning route because the EditView & CloneView share the same UI component
   * We need the origin ID to pre-load the relations into the modifiedData of the new
   * to-be-cloned entity.
   */
  const { params } =
    useRouteMatch('/content-manager/collectionType/:collectionType/create/clone/:origin') ?? {};

  const { origin } = params ?? {};

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
    componentId = get(modifiedData, fieldNameKeys.slice(0, -1))?.id;
  }

  const entityId = origin || modifiedData.id;

  // /content-manager/relations/[model]/[id]/[field-name]
  const relationFetchEndpoint = useMemo(() => {
    if (isCreatingEntry && !origin) {
      return null;
    }

    if (componentUid) {
      // repeatable components and dz are dynamically created
      // if no componentId exists in modifiedData it means that the user just created it
      // there then are no relations to request
      return componentId
        ? `/content-manager/relations/${componentUid}/${componentId}/${fieldNameKeys.at(-1)}`
        : null;
    }

    return `/content-manager/relations/${slug}/${entityId}/${name.split('.').at(-1)}`;
  }, [isCreatingEntry, origin, componentUid, slug, entityId, name, componentId, fieldNameKeys]);

  // /content-manager/relations/[model]/[field-name]
  const relationSearchEndpoint = useMemo(() => {
    if (componentUid) {
      return `/content-manager/relations/${componentUid}/${name.split('.').at(-1)}`;
    }

    return `/content-manager/relations/${slug}/${name.split('.').at(-1)}`;
  }, [componentUid, slug, name]);

  return {
    entityId,
    componentId,
    isComponentRelation: Boolean(componentUid),
    queryInfos: {
      ...queryInfos,
      endpoints: {
        search: relationSearchEndpoint,
        relation: relationFetchEndpoint,
      },
    },
    isCloningEntry: Boolean(origin),
    isCreatingEntry,
    isFieldAllowed,
    isFieldReadable,
  };
}

export default useSelect;
