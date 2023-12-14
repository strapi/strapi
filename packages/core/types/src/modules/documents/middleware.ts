// Utility type to reuse Param definition in MiddlewareContext
import { Common } from '../..';
import { DocumentRepository } from './document-repository';
import type * as Params from './params/document-repository';

export type ParamsMap<TContentTypeUID extends Common.UID.ContentType = Common.UID.ContentType> = {
  findOne: Params.FindOne<TContentTypeUID>;
  findMany: Params.FindMany<TContentTypeUID>;
  findFirst: Params.FindFirst<TContentTypeUID>;
  delete: Params.Delete<TContentTypeUID>;
  deleteMany: Params.DeleteMany<TContentTypeUID>;
  create: Params.Create<TContentTypeUID>;
  clone: Params.Clone<TContentTypeUID>;
  update: Params.Update<TContentTypeUID>;
  count: Params.Count<TContentTypeUID>;
  publish: Params.Publish<TContentTypeUID>;
  unpublish: Params.Unpublish<TContentTypeUID>;
  discardDraft: Params.DiscardDraft<TContentTypeUID>;
};

export interface Context<
  TContentTypeUID extends Common.UID.ContentType = Common.UID.ContentType,
  TAction extends keyof DocumentRepository = keyof DocumentRepository
> {
  uid: TContentTypeUID;
  action: TAction;
  // @ts-expect-error - TODO: Fix this with a proper type from the DocumentService
  params: ParamsMap<TContentTypeUID>[TAction];
  options: object;
  trx?: any;
}

/**
 * Define options for a middleware:
 * - Priority: the higher the priority, the earlier the middleware will be executed
 */
export interface Options {
  priority?: number;
}

export type Middleware<
  TContentTypeUID extends Common.UID.ContentType,
  TAction extends keyof DocumentRepository
> = (
  ctx: Context<TContentTypeUID, TAction>,
  next: (ctx: Context<TContentTypeUID, TAction>) => ReturnType<DocumentRepository[TAction]>
) => ReturnType<DocumentRepository[TAction]>;

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
   *
   * This ways provides a handy way to index middlewares by its uid and action, and
   * to run middlewares with a given priority.
   *
   * The higher the priority, the earlier the middleware will be executed.
   *
   * TODO: Clean this up, this data structure is super confusing
   *       Done it like this to make it work first.
   */
  middlewares: Record<
    // Specify uid or 'all' to apply to all uid's
    Common.UID.ContentType | '_all',
    // Specify action or 'all' to apply to all actions (e.g. findMany, create, ...)
    Record<string | '_all', { priority: number; middleware: Middleware<any, any> }[]>
  >;

  /**
   * Priority map to define middleware priority,
   * handy to define a middleware that should be executed first or last
   */
  priority: {
    LOWEST: number;
    LOW: number;
    DEFAULT: number;
    HIGH: number;
    HIGHEST: number;
  };

  /**
   * Get list of middlewares for a specific uid and action
   */
  get(uid: Common.UID.ContentType, action: string): Middleware<any, any>[];

  /**
   * Add a middleware for a specific uid and action
   */
  add(
    uid: Common.UID.ContentType | '_all',
    action: string | '_all',
    middleware: Middleware<any, any> | Middleware<any, any>[],
    opts?: Options
  ): ThisType<Manager>;

  /**
   * Run middlewares for a specific uid and action
   */
  run<TCtx extends Context<any>>(ctx: TCtx, cb: (ctx: TCtx) => void): Promise<any>;
}
