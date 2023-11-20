import { createSelector } from '@reduxjs/toolkit';

import { useTypedSelector } from '../store/hooks';
import { RootState } from '../store/reducers';

const selectContentTypePermissions = createSelector(
  (state: RootState) => state.rbacProvider.collectionTypesRelatedPermissions,
  (_, slug: string) => slug,
  (state, slug) => {
    // @ts-expect-error – Selectors are weird, why don't they work with TS?
    const currentCTRelatedPermissions = state[slug];
    const readPermissions =
      currentCTRelatedPermissions['plugin::content-manager.explorer.read'] || [];
    const createPermissions =
      currentCTRelatedPermissions['plugin::content-manager.explorer.create'] || [];

    return { createPermissions, readPermissions };
  }
);

const useContentTypePermissions = (slug: string) =>
  useTypedSelector((state) => selectContentTypePermissions(state, slug));

export { useContentTypePermissions };
