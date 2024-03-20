import type { UID, Modules } from '@strapi/types';
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

interface StagePermission extends Omit<Entity, 'createdAt' | 'updatedAt'> {
  action: string;
  actionParameters: object;
  subject?: string | null;
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

export type { UpdateAssignee, UpdateStage, GetStages, Stage, StagePermission };
