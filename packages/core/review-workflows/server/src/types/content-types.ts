import type { Schema, Struct } from '@strapi/types';

// Each schema is the one type generation writes for an application, from the runtime schema in
// `../content-types/`. Loading a schema sets `options.draftAndPublish` to `false` when the runtime
// schema leaves it out. The plugin registers both content types whatever the license, so that their
// data survives a disabled feature (`../index.ts`). Names end in `Schema` because `WorkflowRow` and
// `StageRow` are the row types of the review-workflows contracts.

/** The schema of `plugin::review-workflows.workflow` once loaded (`../content-types/workflow`). */
export interface WorkflowSchema extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows';
  info: {
    name: 'Workflow';
    description: '';
    singularName: 'workflow';
    pluralName: 'workflows';
    displayName: 'Workflow';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: Struct.WithSystemAttributes<
    'plugin::review-workflows.workflow',
    {
      name: Schema.Attribute.String & Schema.Attribute.Required & Schema.Attribute.Unique;
      stages: Schema.Attribute.Relation<'oneToMany', 'plugin::review-workflows.workflow-stage'>;
      stageRequiredToPublish: Schema.Attribute.Relation<
        'oneToOne',
        'plugin::review-workflows.workflow-stage'
      >;
      contentTypes: Schema.Attribute.JSON &
        Schema.Attribute.Required &
        Schema.Attribute.DefaultTo<'[]'>;
    }
  >;
}

/**
 * The schema of `plugin::review-workflows.workflow-stage` once loaded
 * (`../content-types/workflow-stage`).
 */
export interface WorkflowStageSchema extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows_stages';
  info: {
    name: 'Workflow Stage';
    description: '';
    singularName: 'workflow-stage';
    pluralName: 'workflow-stages';
    displayName: 'Stages';
  };
  options: {
    version: '1.1.0';
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: Struct.WithSystemAttributes<
    'plugin::review-workflows.workflow-stage',
    {
      name: Schema.Attribute.String;
      // `STAGE_DEFAULT_COLOR` (`../constants/workflows.ts`).
      color: Schema.Attribute.String & Schema.Attribute.DefaultTo<'#4945FF'>;
      workflow: Schema.Attribute.Relation<'manyToOne', 'plugin::review-workflows.workflow'>;
      permissions: Schema.Attribute.Relation<'manyToMany', 'admin::permission'>;
    }
  >;
}

/**
 * The stage and assignee relations the plugin adds at register, when the license lists
 * `review-workflows`, to every content type visible in the content manager that does not set
 * `options.noStageAttribute` (`../register.ts`, `../utils/review-workflows.ts`). The runtime reads
 * both options as truthy or falsy; the `except` shapes match their boolean values.
 */
export type StageAttributes = {
  attributes: {
    strapi_assignee: Schema.Attribute.Relation<'oneToOne', 'admin::user'>;
    strapi_stage: Schema.Attribute.Relation<'oneToOne', 'plugin::review-workflows.workflow-stage'>;
  };
  except:
    | { pluginOptions: { 'content-manager': { visible: false } } }
    | { options: { noStageAttribute: true } };
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageContentTypeSchemas {
        'plugin::review-workflows.workflow': WorkflowSchema;
        'plugin::review-workflows.workflow-stage': WorkflowStageSchema;
      }

      interface LicensedContentTypeAttributes {
        'review-workflows': StageAttributes;
      }
    }
  }
}
