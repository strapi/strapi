import { type Route } from '@strapi/types/dist/core';
import { controllers } from '../controllers';

const routes: Route[] = [
  {
    method: 'GET',
    path: '/me',
    handler: controllers.userController.getProfile,
    config: {},
    info: {},
  },
  {
    method: 'GET',
    path: '/projects',
    handler: controllers.projectsController.getProjects,
    config: {},
    info: {},
  },
  {
    method: 'GET',
    path: '/projects/:projectName',
    handler: controllers.projectsController.getProject,
    config: {},
    info: {},
  },
  {
    method: 'POST',
    path: '/projects',
    handler: controllers.projectsController.createProject,
    config: {},
    info: {},
  },
  {
    method: 'POST',
    path: '/deploy',
    handler: controllers.deployController.deploy,
    config: {},
    info: {},
  },
];

export { routes };
