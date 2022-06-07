import { Context } from 'koa';

type ControllerResponse<T = unknown> = T | Promise<T> | undefined;

interface BaseController {
  transformResponse(data: object, meta: object): object;
  sanitizeOutput(data: object, ctx: Context): Promise<object>;
  sanitizeInput(data: object, ctx: Context): Promise<object>;
}

export interface SingleTypeController extends BaseController {
  find(ctx: Context): ControllerResponse;
  update(ctx: Context): ControllerResponse;
  delete(ctx: Context): ControllerResponse;
}

export interface CollectionTypeController extends BaseController {
  find(ctx: Context): ControllerResponse;
  findOne(ctx: Context): ControllerResponse;
  create(ctx: Context): ControllerResponse;
  update(ctx: Context): ControllerResponse;
  delete(ctx: Context): ControllerResponse;
}

export type Controller = SingleTypeController | CollectionTypeController;

export type GenericController = Partial<Controller> & {
  [method: string | number | symbol]: (ctx: Context) => unknown;
};
