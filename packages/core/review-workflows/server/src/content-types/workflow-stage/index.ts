import { STAGE_DEFAULT_COLOR } from '../../constants/workflows';

export default {
  schema: {
    collectionName: 'strapi_workflows_stages',
    info: {
      name: 'Workflow Stage',
      description: '',
      singularName: 'workflow-stage',
      pluralName: 'workflow-stages',
      displayName: 'Stages',
    },
    options: {
      version: '1.1.0',
    },
    pluginOptions: {
      'content-manager': {
        visible: false,
      },
      'content-type-builder': {
        visible: false,
      },
    },
    attributes: {
      name: {
        type: 'string',
        configurable: false,
      },
      color: {
        type: 'string',
        configurable: false,
        default: STAGE_DEFAULT_COLOR,
      },
      workflow: {
        type: 'relation',
        target: 'plugin::review-workflows.workflow',
        relation: 'manyToOne',
        inversedBy: 'stages',
        configurable: false,
      },
      permissions: {
        type: 'relation',
        target: 'admin::permission',
        relation: 'manyToMany',
        configurable: false,
      },
    },
  },
};
