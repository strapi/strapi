import type * as Utils from '../../utils';
import type * as UID from '../../uid';

import type { IsDraftAndPublishEnabled } from './draft-and-publish';
import type * as Params from './params/document-engine';
import type * as Result from './result/document-engine';

export type ServiceInstance<TContentTypeUID extends UID.ContentType = UID.ContentType> = {
  findMany<const TParams extends Params.FindMany<TContentTypeUID>>(
    params?: TParams
  ): Result.FindMany<TContentTypeUID, TParams>;

  findFirst<const TParams extends Params.FindFirst<TContentTypeUID>>(
    params?: TParams
  ): Result.FindFirst<TContentTypeUID, TParams>;

  findOne<const TParams extends Params.FindOne<TContentTypeUID>>(
    params: TParams
  ): Result.FindOne<TContentTypeUID, TParams>;

  delete<const TParams extends Params.Delete<TContentTypeUID>>(
    params: TParams
  ): Result.Delete<TContentTypeUID, TParams>;

  create<const TParams extends Params.Create<TContentTypeUID>>(
    params: TParams
  ): Result.Create<TContentTypeUID, TParams>;

  update<const TParams extends Params.Update<TContentTypeUID>>(
    params: TParams
  ): Result.Update<TContentTypeUID, TParams>;

  count<const TParams extends Params.Count<TContentTypeUID>>(params: TParams): Result.Count;

  /**
   * @internal
   */
  clone<const TParams extends Params.Clone<TContentTypeUID>>(
    params: TParams
  ): Result.Clone<TContentTypeUID, TParams>;
} & Utils.If<
  // Only add publication methods if draft and publish is enabled on the content-type
  IsDraftAndPublishEnabled<TContentTypeUID>,
  DraftAndPublishExtension<TContentTypeUID>,
  unknown
>;

/**
 * Provides methods for managing the draft and publish lifecycle of a document.
 *
 * This interface handles publishing, unpublishing, and discarding
 * drafts of documents identified by their unique identifier.
 *
 * @template TContentTypeUID - The unique identifier type for the content-type, constrained to {@link UID.ContentType}.
 */
export interface DraftAndPublishExtension<
  TContentTypeUID extends UID.ContentType = UID.ContentType,
> {
  /**
   * Publishes the current draft for the given document ID.
   */
  publish<const TParams extends Params.Publish<TContentTypeUID>>(
    params: TParams
  ): Result.Publish<TContentTypeUID, TParams>;

  /**
   * Unpublishes a document for the given document ID.
   */
  unpublish<const TParams extends Params.Unpublish<TContentTypeUID>>(
    params: TParams
  ): Result.Unpublish<TContentTypeUID, TParams>;

  /**
   * Discards the draft entry for the given document ID and params.
   */
  discardDraft<const TParams extends Params.DiscardDraft<TContentTypeUID>>(
    params: TParams
  ): Result.DiscardDraft<TContentTypeUID, TParams>;
}

/**
 * Represents the parameters for various service operations on content types.
 *
 * This type aggregates different sets of parameters required for performing operations such as
 * finding, creating, updating, deleting, cloning, and publishing content within a content management system.
 *
 * Each operation has its own set of parameters defined using different subtypes.
 *
 * @template TContentTypeUID - Extends {@link UID.ContentType}, used to specify the unique identifier for a content-type.
 *
 * @example
 * Example of how to specify parameters for different operations on a content-type:
 *
 * ```typescript
 * import type { UID } from '../../uid';
 *
 * type ArticleServiceParams = ServiceParams<'api::article.article'>;
 *
 * // Example: Parameters for finding multiple articles
 * const findManyParams: ArticleServiceParams['findMany'] = {
 *   fields: ['title', 'content'],
 *   filters: { status: 'published' },
 *   sort: { createdAt: 'desc' }
 * };
 *
 * // Example: Parameters for creating a new article
 * const createParams: ArticleServiceParams['create'] = {
 *   data: { title: 'New Article', content: 'Article content', status: 'draft' }
 * };
 * ```
 */
export type ServiceParams<TContentTypeUID extends UID.ContentType = UID.ContentType> = {
  /** Parameters for finding multiple documents */
  findMany: Params.FindMany<TContentTypeUID>;

  /** Parameters for finding a single document */
  findFirst: Params.FindFirst<TContentTypeUID>;

  /** Parameters for finding a single document by its ID */
  findOne: Params.FindOne<TContentTypeUID>;

  /** Parameters for deleting a single document */
  delete: Params.Delete<TContentTypeUID>;

  /** Parameters for creating a new document */
  create: Params.Create<TContentTypeUID>;

  /** Parameters for cloning an existing document */
  clone: Params.Clone<TContentTypeUID>;

  /** Parameters for updating an existing document */
  update: Params.Update<TContentTypeUID>;

  /** Parameters for counting the number of documents  */
  count: Params.Count<TContentTypeUID>;

  /** Parameters for publishing a document */
  publish: Params.Publish<TContentTypeUID>;

  /** Parameters for unpublishing a document */
  unpublish: Params.Unpublish<TContentTypeUID>;

  /** Parameters for discarding a draft of a document */
  discardDraft: Params.DiscardDraft<TContentTypeUID>;
};
