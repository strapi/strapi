import type { Common } from '../../..';

export type ArrayNotation = Common.RouteInput[];

export interface ObjectNotation {
  routes: Common.RouteInput[];
  type?: Common.RouterType;
}

export interface NamedRoutes {
  [key: string]: ObjectNotation;
}

export type Routes = ArrayNotation | NamedRoutes;
