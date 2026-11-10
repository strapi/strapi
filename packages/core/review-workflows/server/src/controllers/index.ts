import type {} from 'koa-body';
import type { Core } from '@strapi/types';

import workflows from './workflows';
import stages from './stages';
import assignees from './assignees';
import homepage from '../homepage';
import type { Controllers } from '../types/controllers';

const coreControllers = { workflows, stages, assignees } satisfies Omit<Controllers, 'homepage'>;

// The registered names match the map. `homepage` is named by hand: its feature map is typed with an
// index signature, and its factory is checked in `../homepage/controllers/homepage`.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ControllerNames = Core.Assert<
  Core.SameNames<
    keyof typeof coreControllers | 'homepage',
    keyof Core.RegisteredFor<Strapi.Registries.PackageControllers, 'plugin::review-workflows'>
  >
>;

export default {
  ...coreControllers,
  ...homepage.controllers,
};
