import { Context, Next } from 'koa';
import { ControllerHandler } from '../../types/core/common';

interface Controller {
  transformResponse(data: object, meta: object): object;
  sanitizeOutput(data: object, ctx: Context): Promise<object>;
  sanitizeInput(data: object, ctx: Context): Promise<object>;
}

export interface SingleTypeController extends Controller {
  find?: ControllerHandler;
  update?: ControllerHandler;
  delete?: ControllerHandler;
}

export interface CollectionTypeController extends Controller {
  find?: ControllerHandler;
  findOne?: ControllerHandler;
  create?: ControllerHandler;
  update?: ControllerHandler;
  delete?: ControllerHandler;
}

export type GenericController = Partial<Controller> & {
  [method: string | number | symbol]: ControllerHandler;
};
