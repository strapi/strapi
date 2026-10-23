import type { Core } from '@strapi/types';

/** Admin actions creating, updating, deleting and listing workflows. */
export type WorkflowsController = {
  create: Core.ControllerHandler;
  update: Core.ControllerHandler;
  delete: Core.ControllerHandler;
  find: Core.ControllerHandler;
};

/**
 * Admin actions listing and reading the stages of a workflow, moving an entry to another stage, and
 * listing the stages an entry can move to.
 */
export type StagesController = {
  find: Core.ControllerHandler;
  findById: Core.ControllerHandler;
  updateEntity: Core.ControllerHandler;
  listAvailableStages: Core.ControllerHandler;
};

/** Admin action changing the assignee of an entry. */
export type AssigneesController = {
  updateEntity: Core.ControllerHandler;
};

/** Admin action listing the documents recently assigned to the current user, for the homepage. */
export type HomepageController = {
  getRecentlyAssignedDocuments: Core.ControllerHandler;
};

/** The controller contracts by name, as in the plugin's controllers map. Used to check the routes. */
export type Controllers = {
  assignees: AssigneesController;
  homepage: HomepageController;
  stages: StagesController;
  workflows: WorkflowsController;
};
