import { Context, Next } from 'koa';

type ControllerResponse<T = unknown> = T | Promise<T> | undefined;

interface Controller {
  transformResponse(data: object, meta: object): object;
  sanitizeOutput(data: object, ctx: Context): Promise<object>;
  sanitizeInput(data: object, ctx: Context): Promise<object>;
}

export interface SingleTypeController extends Controller {
  find?(ctx: Context, next: Next): ControllerResponse;
  update?(ctx: Context, next: Next): ControllerResponse;
  delete?(ctx: Context, next: Next): ControllerResponse;
}

export interface CollectionTypeController extends Controller {
  find?(ctx: Context, next: Next): ControllerResponse;
  findOne?(ctx: Context, next: Next): ControllerResponse;
  create?(ctx: Context, next: Next): ControllerResponse;
  update?(ctx: Context, next: Next): ControllerResponse;
  delete?(ctx: Context, next: Next): ControllerResponse;
}

export type GenericController = Partial<Controller> & {
  [method: string | number | symbol]: (ctx: Context) => unknown;
};
