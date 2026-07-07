import { Utils } from '../../..';
import type * as Core from '../../../core';

export type Controller = Utils.StrapiFactory<Core.Controller>;

export interface Controllers {
  [key: string]: Controller;
}
