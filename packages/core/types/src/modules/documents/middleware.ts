// Utility type to reuse Param definition in MiddlewareContext
import { Common } from '../..';
import { DocumentService } from './document-service';
import type * as Params from './params';

export type ParamsMap<TContentTypeUID extends Common.UID.ContentType = Common.UID.ContentType> = {
  findOne: Params.FindOne<TContentTypeUID>;
  findMany: Params.FindMany<TContentTypeUID>;
  findPage: Params.FindPage<TContentTypeUID>;
  findFirst: Params.FindFirst<TContentTypeUID>;
  delete: Params.Delete<TContentTypeUID>;
  deleteMany: Params.DeleteMany<TContentTypeUID>;
  create: Params.Create<TContentTypeUID>;
  clone: Params.Clone<TContentTypeUID>;
  update: Params.Update<TContentTypeUID>;
  count: Params.Count<TContentTypeUID>;
  publish: Params.Publish<TContentTypeUID>;
  unpublish: Params.Unpublish<TContentTypeUID>;
};

export interface Context<
  TContentTypeUID extends Common.UID.ContentType = Common.UID.ContentType,
  TAction extends keyof ParamsMap<TContentTypeUID> = keyof ParamsMap<TContentTypeUID>
> {
  uid: TContentTypeUID;
  action: TAction;
  params: ParamsMap<TContentTypeUID>[TAction];
  options: object;
  trx?: any;
}

export type Middleware<TAction extends keyof DocumentService> = (
  ctx: Context,
  next: (ctx: Context) => ReturnType<DocumentService[TAction]>
) => ReturnType<DocumentService[TAction]>;

/**
 * Handles middlewares for document service
 */
export interface Manager {
  /**
   * Store middlewares for each uid,
   * if no uid is provided, the 'all' attribute will apply to all uid's
   *
   * Each uid has a list of middlewares for each action
   * (findMany, findOne, create, update, delete, ...)
   */
  middlewares: Record<
    Common.UID.ContentType | 'allUIDs',
    Record<string | 'allActions', Middleware<any>[]>
  >;

  /**
   * Get list of middlewares for a specific uid and action
   */
  get(uid: Common.UID.ContentType, action: string): Middleware<any>[];

  /**
   * Add a middleware for a specific uid and action
   */
  add(
    uid: Common.UID.ContentType | 'allUIDs',
    action: string | 'allActions',
    middleware: Middleware<any>
  ): ThisType<Manager>;

  /**
   * Run middlewares for a specific uid and action
   */
  run<TCtx extends Context<any>>(ctx: TCtx, cb: (ctx: TCtx) => void): Promise<any>;
}
