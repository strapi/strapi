import type { UID, Modules } from '@strapi/types';
import type { Permission } from '@strapi/admin/strapi-admin';
import type { errors } from '@strapi/utils';

type Entity = Modules.EntityService.Result<UID.Schema>;

/**
 * /content-manager/<collection-type | single-type>/:model/:id/assignee
 */
namespace UpdateAssignee {
  export interface Request {
    body: {
      data: {
        id: Entity['id'] | null;
      };
    };
    query: {};
  }

  export interface Params {
    model: string;
    id: Entity['id'];
  }

  export interface Response {
    data: Entity;
    error?: errors.ApplicationError;
  }
}

interface StagePermission
  extends Omit<Permission, 'createdAt' | 'updatedAt' | 'properties' | 'conditions'> {
  role: number;
}

interface Stage extends Entity {
  color: string;
  name: string;
  permissions?: StagePermission[];
}

/**
 * GET /content-manager/<collection-type | single-type>/:model/:id/stages
 */
namespace GetStages {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Params {
    model: string;
    id: Entity['id'];
  }

  export interface Response {
    data: Stage[];
    meta?: { workflowCount: number };
    error?: errors.ApplicationError;
  }
}

/**
 * PUT /content-manager/<collection-type | single-type>/:model/:id/stage
 */
namespace UpdateStage {
  export interface Request {
    body: {
      data: {
        id: Entity['id'];
      };
    };
    query: {};
  }

  export interface Params {
    model: string;
    id: Entity['id'];
  }

  export interface Response {
    data: Entity;
    error?: errors.ApplicationError;
  }
}

interface Stage extends Entity {
  color: string;
  name: string;
  permissions?: StagePermission[];
}

interface Workflow extends Entity {
  name: string;
  contentTypes: string[];
  stages: Stage[];
  stageRequiredToPublish: Stage | null;
}

namespace GetAll {
  export interface Request {
    body: {};
    query: Modules.EntityService.Params.Pick<
      'admin::review-workflow',
      'filters' | 'populate:array'
    >;
  }

  export interface Response {
    data: Workflow[];
    meta?: { workflowCount: number };
    error?: errors.ApplicationError;
  }
}

namespace Update {
  export interface Request {
    body: {
      data: Partial<Omit<Workflow, 'stageRequiredToPublish'>> & {
        stageRequiredToPublishName?: Stage['name'] | null;
      };
    };
    query: {};
  }

  export interface Params {
    id: Entity['id'];
  }

  export interface Response {
    data: Workflow;
    error?: errors.ApplicationError;
  }
}

namespace Create {
  export interface Request {
    body: {
      data: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'> & {
        // We cannot use id because the stage could be not created yet
        // And considering name is unique inside the workflow, name is a better option
        stageRequiredToPublishName?: Stage['name'] | null;
      };
    };
    query: {};
  }

  export interface Response {
    data: Workflow;
    error?: errors.ApplicationError;
  }
}

namespace Delete {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Params {
    id: Entity['id'];
  }

  export interface Response {
    data: Workflow;
    error?: errors.ApplicationError;
  }
}

export type {
  Stage,
  Workflow,
  GetAll,
  Update,
  Create,
  Delete,
  UpdateAssignee,
  UpdateStage,
  GetStages,
  StagePermission,
};
