import type { Common } from '../../..';

export type ArrayNotation = readonly Common.RouteInput[];

export interface ObjectNotation {
  routes: readonly Common.RouteInput[];
  type?: Common.RouterType;
}

export interface NamedRoutes {
  [key: string]: ObjectNotation;
}

export type Routes = ArrayNotation | NamedRoutes;
