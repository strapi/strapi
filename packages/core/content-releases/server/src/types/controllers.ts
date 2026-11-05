import type { Core } from '@strapi/types';

/** Actions of the release controller (`routes/release.ts`). */
export type ReleaseController = {
  /** `GET /content-releases/getByDocumentAttached` */
  findByDocumentAttached: Core.ControllerHandler;
  /** `GET /content-releases/` */
  findPage: Core.ControllerHandler;
  /** `GET /content-releases/:id` */
  findOne: Core.ControllerHandler;
  /** `GET /content-releases/mapEntriesToReleases` */
  mapEntriesToReleases: Core.ControllerHandler;
  /** `POST /content-releases/` */
  create: Core.ControllerHandler;
  /** `PUT /content-releases/:id` */
  update: Core.ControllerHandler;
  /** `DELETE /content-releases/:id` */
  delete: Core.ControllerHandler;
  /** `POST /content-releases/:id/publish` */
  publish: Core.ControllerHandler;
};

/** Actions of the release action controller (`routes/release-action.ts`). */
export type ReleaseActionController = {
  /** `POST /content-releases/:releaseId/actions` */
  create: Core.ControllerHandler;
  /** `POST /content-releases/:releaseId/actions/bulk` */
  createMany: Core.ControllerHandler;
  /** `GET /content-releases/:releaseId/actions` */
  findMany: Core.ControllerHandler;
  /** `PUT /content-releases/:releaseId/actions/:actionId` */
  update: Core.ControllerHandler;
  /** `DELETE /content-releases/:releaseId/actions/:actionId` */
  delete: Core.ControllerHandler;
};

/** Actions of the releases settings controller (`routes/settings.ts`). */
export type SettingsController = {
  /** `GET /content-releases/settings` */
  find: Core.ControllerHandler;
  /** `PUT /content-releases/settings` */
  update: Core.ControllerHandler;
};

/** Actions of the homepage widget controller (`routes/homepage.ts`). */
export type HomepageController = {
  /** `GET /content-releases/homepage/upcoming-releases` */
  getUpcomingReleases: Core.ControllerHandler;
};

/** The controller contracts by name, as in the plugin's controllers map. Used to check the routes. */
export type Controllers = {
  homepage: HomepageController;
  release: ReleaseController;
  'release-action': ReleaseActionController;
  settings: SettingsController;
};
