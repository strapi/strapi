import { useMemo } from 'react';

import { createSelector } from '@reduxjs/toolkit';
import { Permission } from '@strapi/helper-plugin';

import { useTypedSelector } from '../store/hooks';
import { RootState } from '../store/reducers';

const makeSelectContentTypePermissions = () =>
  // @ts-expect-error – I have no idea why this fails like this.
  createSelector(
    (state: RootState) => state.rbacProvider.collectionTypesRelatedPermissions,
    (_, slug: string) => slug,
    (state: RootState['rbacProvider']['collectionTypesRelatedPermissions'], slug: string) => {
      const currentCTRelatedPermissions = slug ? state[slug] : {};

      if (!currentCTRelatedPermissions) {
        return { createPermissions: [], readPermissions: [] };
      }

      const readPermissions =
        currentCTRelatedPermissions['plugin::content-manager.explorer.read'] || [];
      const createPermissions =
        currentCTRelatedPermissions['plugin::content-manager.explorer.create'] || [];

      return { createPermissions, readPermissions };
    }
  );

const useContentTypePermissions = (
  slug?: string
): { createPermissions: Permission[]; readPermissions: Permission[] } => {
  const selectContentTypePermissions = useMemo(makeSelectContentTypePermissions, []);
  return useTypedSelector((state) => selectContentTypePermissions(state, slug));
};

export { useContentTypePermissions };
