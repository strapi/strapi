import type { Common } from '../../..';
// import { Router } from '../../../../core-api';

export interface Routes {
  // TODO: Make RouteInput a generic that enforces the route type (either undefined or matching the RouteType key here)
  'content-api'?: Common.RouteInput[] | (() => Common.RouteInput[]); // TODO: Should this be Router.Router & { type: 'content-api' }; ?
  admin?: Common.RouteInput[] | (() => Common.RouteInput[]); // TODO: Should this be Router.Router & { type: 'admin' }; ?
}
