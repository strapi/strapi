// Type checks only, run by `yarn test:ts`. Licensed attributes follow `typescript.licensedFeatures`,
// not the license type generation boots with. This app lists no feature, so review workflows adds
// no stage or assignee to its content types, even when type generation runs with a license.
import type { Schema } from '@strapi/strapi';

type StageAttributeName =
  keyof Strapi.Registries.LicensedContentTypeAttributes['review-workflows']['attributes'];

export const noStageAttributes: Extract<
  keyof Schema.ContentType<'api::article.article'>['attributes'],
  StageAttributeName
> extends never
  ? true
  : false = true;
