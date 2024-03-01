import type { RouterType, RouteInput } from '../../../core';

export type ArrayNotation = RouteInput[];

export interface ObjectNotation {
  routes: RouteInput[];
  type?: RouterType;
}

export interface NamedRoutes {
  [key: string]: ObjectNotation;
}

export type Routes = ArrayNotation | NamedRoutes;
