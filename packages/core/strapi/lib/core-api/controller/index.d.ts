import { Context } from 'koa';

type Response = object;

interface BaseController {
  transformResponse(data: object, meta: object): object;
  sanitizeOutput(data: object, ctx: Context): Promise<object>;
  sanitizeInput(data: object, ctx: Context): Promise<object>;
}

export interface SingleTypeController extends BaseController {
  find(ctx: Context): Promise<Response>;
  update(ctx: Context): Promise<Response>;
  delete(ctx: Context): Promise<Response>;
}

export interface CollectionTypeController extends BaseController {
  find(ctx: Context): Promise<Response>;
  findOne(ctx: Context): Promise<Response>;
  create(ctx: Context): Promise<Response>;
  update(ctx: Context): Promise<Response>;
  delete(ctx: Context): Promise<Response>;
}

export type Controller = SingleTypeController | CollectionTypeController;
