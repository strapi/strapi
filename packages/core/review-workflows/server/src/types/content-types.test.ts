// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type { Schema } from '@strapi/types';
import type {
  ENTITY_ASSIGNEE_ATTRIBUTE,
  ENTITY_STAGE_ATTRIBUTE,
  STAGE_MODEL_UID,
} from '../constants/workflows';
import type { StageAttributes, WorkflowSchema, WorkflowStageSchema } from './content-types';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

declare const checks: [
  Expect<Equal<Schema.ContentType<'plugin::review-workflows.workflow'>, WorkflowSchema>>,
  Expect<Equal<Schema.ContentType<'plugin::review-workflows.workflow-stage'>, WorkflowStageSchema>>,
  // The licensed attributes are the relations `../register.ts` adds, as type generation writes them.
  Expect<
    Equal<
      keyof StageAttributes['attributes'],
      typeof ENTITY_STAGE_ATTRIBUTE | typeof ENTITY_ASSIGNEE_ATTRIBUTE
    >
  >,
  Expect<
    Equal<
      StageAttributes['attributes'][typeof ENTITY_STAGE_ATTRIBUTE],
      Schema.Attribute.Relation<'oneToOne', typeof STAGE_MODEL_UID>
    >
  >,
  Expect<
    Equal<
      StageAttributes['attributes'][typeof ENTITY_ASSIGNEE_ATTRIBUTE],
      Schema.Attribute.Relation<'oneToOne', 'admin::user'>
    >
  >,
  Expect<
    Equal<Strapi.Registries.LicensedContentTypeAttributes['review-workflows'], StageAttributes>
  >,
];
checks satisfies unknown;

// The plugin declares its content-type schemas: the Document Service reads them without type
// generation. They exist whatever the license, so the Document Service never resolves to
// `undefined`, unlike the services.
const workflow = await strapi
  .documents('plugin::review-workflows.workflow')
  .findFirst({ populate: ['stages'] });
if (workflow !== null) {
  workflow.name satisfies string | null;
  workflow.stages satisfies Array<{ name?: string | null; color?: string | null }>;
  // @ts-expect-error Only the populated relations are read.
  workflow.stageRequiredToPublish satisfies unknown;
  // @ts-expect-error Not an attribute of plugin::review-workflows.workflow.
  workflow.missing satisfies unknown;
}
// @ts-expect-error Filters are checked against the declared schema.
strapi.documents('plugin::review-workflows.workflow-stage').findMany({ filters: { missing: 1 } });
strapi.documents('plugin::review-workflows.workflow-stage').update({
  documentId: 'abc',
  // @ts-expect-error Writes are checked against the declared schema.
  data: { title: 'Draft' },
});
strapi.getModel('plugin::review-workflows.workflow-stage').attributes
  .color satisfies WorkflowStageSchema['attributes']['color'];
// Content types no package declares stay generic.
strapi.documents('api::article.article').findMany({ filters: { anything: { $eq: 1 } } });
