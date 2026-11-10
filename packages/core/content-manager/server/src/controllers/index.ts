import type { Core } from '@strapi/types';
import type {} from '../types';
import type { RegisteredControllers } from '../types/controllers';

import collectionTypes from './collection-types';
import components from './components';
import contentTypes from './content-types';
import init from './init';
import relations from './relations';
import singleTypes from './single-types';
import uid from './uid';
import history from '../history';
import preview from '../preview';
import homepage from '../homepage';
import customOrder from '../custom-order';
import type { HistoryControllers } from '../history/controllers';
import type { PreviewControllers } from '../preview/controllers';
import type { HomepageControllers } from '../homepage/controllers';
import type { CustomOrderControllers } from '../custom-order/controllers';

/**
 * Names of the feature controllers. The feature modules cast their maps to a loose `LoadedPlugin`
 * map, whose names drop out of the spreads below, so they are read from the feature contracts.
 */
type FeatureControllerName =
  | keyof HistoryControllers
  | keyof PreviewControllers
  | keyof HomepageControllers
  | keyof CustomOrderControllers;

/** Controllers of the core Content Manager routes, without the feature controllers. */
const coreControllers = {
  'collection-types': collectionTypes,
  components,
  'content-types': contentTypes,
  init,
  relations,
  'single-types': singleTypes,
  uid,
} satisfies Omit<RegisteredControllers, FeatureControllerName>;

/** Names of the composed controller map, feature controllers included. */
export type ControllerMapNames = keyof typeof coreControllers | FeatureControllerName;

// Every registered controller name has an implementation, and every implementation a registered name.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ControllerNames = Core.Assert<Core.SameNames<ControllerMapNames, keyof RegisteredControllers>>;

export default {
  ...coreControllers,
  ...(history.controllers ? history.controllers : {}),
  ...(preview.controllers ? preview.controllers : {}),
  ...(customOrder.controllers ? customOrder.controllers : {}),
  ...homepage.controllers,
};
