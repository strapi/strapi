import { Context, Next } from 'koa';

type ControllerResponse<T = unknown> = T | Promise<T> | undefined;

interface BaseController {
  transformResponse(data: object, meta: object): object;
  sanitizeOutput(data: object, ctx: Context): Promise<object>;
  sanitizeInput(data: object, ctx: Context): Promise<object>;
}

export interface SingleTypeController extends BaseController {
  find?(ctx: Context, next: Next): ControllerResponse;
  update?(ctx: Context, next: Next): ControllerResponse;
  delete?(ctx: Context, next: Next): ControllerResponse;
}

export interface CollectionTypeController extends BaseController {
  find?(ctx: Context, next: Next): ControllerResponse;
  findOne?(ctx: Context, next: Next): ControllerResponse;
  create?(ctx: Context, next: Next): ControllerResponse;
  update?(ctx: Context, next: Next): ControllerResponse;
  delete?(ctx: Context, next: Next): ControllerResponse;
}

export type Controller = SingleTypeController | CollectionTypeController;

export type GenericController = Partial<BaseController> & {
  [method: string | number | symbol]: (ctx: Context) => unknown;
};
