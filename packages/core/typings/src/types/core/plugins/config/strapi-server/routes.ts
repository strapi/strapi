import type { Common } from '../../..';
// import { Router } from '../../../../core-api';

export type ArrayNotation = Common.RouteInput[];

export interface ObjectNotation {
  routes: Common.RouteInput[];
  type?: Common.RouterType;
}

export interface NamedRoutes {
  [key: string]: ObjectNotation;
}

export type Routes = ArrayNotation | NamedRoutes;
