import { Context, Next } from 'koa';
import { ControllerHandler } from '../../types/core/common';

interface Controller {
  transformResponse(data: object, meta: object): object;
  sanitizeOutput(data: object, ctx: Context): Promise<object>;
  sanitizeInput(data: object, ctx: Context): Promise<object>;
}

export interface SingleTypeController extends Controller {
  find?: ControllerHandler<unknown>;
  update?: ControllerHandler<unknown>;
  delete?: ControllerHandler<unknown>;
}

export interface CollectionTypeController extends Controller {
  find?: ControllerHandler<unknown>;
  findOne?: ControllerHandler<unknown>;
  create?: ControllerHandler<unknown>;
  update?: ControllerHandler<unknown>;
  delete?: ControllerHandler<unknown>;
}

export type GenericController = Partial<Controller> & {
  [method: string | number | symbol]: (ctx: Context, next?: Next) => unknown;
};
