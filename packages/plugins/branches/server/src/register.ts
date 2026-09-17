import _ from 'lodash';
import type { Core } from '@strapi/types';

import { BRANCH_MODEL_UID } from './constants';
import { createBranchingMiddleware } from './document-service/branching';
import { isBranchableContentType } from './utils';

/**
 * Fresh descriptor per content type — Strapi mutates attribute metadata during
 * model registration, so a shared object corrupts join metadata (lesson from
 * the spaces plugin). `useJoinTable: false` → a real `branch_id` column:
 * NULL = main, otherwise the branch the row was created on.
 */
const makeBranchRelation = () => ({
  type: 'relation' as const,
  relation: 'manyToOne' as const,
  target: BRANCH_MODEL_UID,
  useJoinTable: false,
  writable: true,
  // Private: API consumers pick their branch with the header, never by
  // reading or writing the relation.
  private: true,
  configurable: false,
  visible: false,
});

const extendBranchableContentTypes = (strapi: Core.Strapi) => {
  Object.values(strapi.contentTypes).forEach((contentType) => {
    if (!isBranchableContentType(contentType)) {
      return;
    }
    _.set(contentType.attributes, 'branch', makeBranchRelation());
  });
};

export default ({ strapi }: { strapi: Core.Strapi }) => {
  // 1. `branch` FK on every branchable content type (creates the `branch_id` column).
  extendBranchableContentTypes(strapi);

  // 2. The document-service middleware — registered HERE so it sits ahead of
  //    the middlewares other plugins register in their bootstrap (i18n's
  //    non-localized sync, History's versioning, Spaces' stamping): an update
  //    on a branch is short-circuited into a delta and never reaches them.
  strapi.documents.use(createBranchingMiddleware(strapi));

  // NOTE: the resolve-branch Koa middleware is registered in `bootstrap.ts`:
  // core middlewares (error handling, `ctx.badRequest`) initialize between
  // the register and bootstrap phases and must run before it.
};
