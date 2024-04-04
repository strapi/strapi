import type { Strapi } from '../../../core';

export type LifecycleMethod = ({ strapi }: { strapi: Strapi }) => Promise<unknown> | unknown;

export type Register = LifecycleMethod;
export type Bootstrap = LifecycleMethod;
export type Destroy = LifecycleMethod;
