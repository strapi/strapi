import { Context } from 'koa';

type Response <T=unknown> = T;

interface BaseController {
  transformResponse(data: object, meta: object): object;
  sanitizeOutput(data: object, ctx: Context): Promise<object>;
  sanitizeInput(data: object, ctx: Context): Promise<object>;
}

export interface SingleTypeController extends BaseController {
  find(ctx: Context): Promise<Response>| Response ;
  update(ctx: Context): Promise<Response>| Response ;
  delete(ctx: Context): Promise<Response>| Response ;
}

export interface CollectionTypeController extends BaseController {
  find(ctx: Context): Promise<Response> | Response;
  findOne(ctx: Context): Promise<Response> | Response;
  create(ctx: Context): Promise<Response> | Response;
  update(ctx: Context): Promise<Response> | Response;
  delete(ctx: Context): Promise<Response> | Response;
}

export type Controller = SingleTypeController | CollectionTypeController;

export type GenericController = Partial<Controller> & {
  [method: string | number | symbol]: (ctx: Context) => unknown
}
​
