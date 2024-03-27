import type { UID, Utils } from '../..';
import type { ID } from '.';
import type { IsDraftAndPublishEnabled } from './draft-and-publish';
import type * as Params from './params/document-engine';
import type * as Result from './result/document-engine';

/**
 * Provides a functional representation of a document service instance .
 *
 * @remark
 * The return type of the service instance varies based on the status of the Schema Registry (extended or not),
 * as well as whether the option for Draft & Publish is enabled for the given content type.
 * *
 * @template TContentTypeUID - the UID of the content type to be worked with. It should extend {@link UID.ContentType}.
 *
 * @see {@link Utils.Constants.AreSchemaRegistriesExtended}
 * @see {@link IsDraftAndPublishEnabled}
 *
 */
export type ServiceInstance<TContentTypeUID extends UID.ContentType = UID.ContentType> = Utils.If<
  Utils.Constants.AreSchemaRegistriesExtended,
  // If schemas are registered, return the accurate type for the service
  // instance based on whether the content type has D&P enabled or not
  Utils.If<
    IsDraftAndPublishEnabled<TContentTypeUID>,
    ServiceInstanceWithDraftAndPublish<TContentTypeUID>,
    BaseServiceInstance<TContentTypeUID>
  >,
  // Else, if schemas are not registered, return a loose union
  BaseServiceInstance<TContentTypeUID> | ServiceInstanceWithDraftAndPublish<TContentTypeUID>
>;

/**
 * Generic interface for interacting with documents. It defines several operations (find, delete, create, clone, update,
 * count) which can be performed on the specified content type.
 *
 * @remark
 * Methods types are tailored based on the given {@link TContentTypeUID} parameter.
 *
 * @template TContentTypeUID - The UID of the content type to be worked with. It extends the {@link UID.ContentType} type.
 */
export type BaseServiceInstance<TContentTypeUID extends UID.ContentType = UID.ContentType> = {
  /**
   * Finds multiple documents of a specific content type based on the provided parameters.
   */
  findMany<TParams extends Params.FindMany<TContentTypeUID>>(
    params?: TParams
  ): Result.FindMany<TContentTypeUID, TParams>;

  /**
   * Finds the first document of a specific content type that matches the provided parameters.
   */
  findFirst<TParams extends Params.FindFirst<TContentTypeUID>>(
    params?: TParams
  ): Result.FindFirst<TContentTypeUID, TParams>;

  /**
   * Finds a single document of a specific content type based on the given ID and parameters.
   */
  findOne<TParams extends Params.FindOne<TContentTypeUID>>(
    id: ID,
    params?: TParams
  ): Result.FindOne<TContentTypeUID, TParams>;

  /**
   * Deletes a single document based of a specific content type based on the given ID and parameters.
   */
  delete<TParams extends Params.Delete<TContentTypeUID>>(
    documentId: ID,
    params?: TParams
  ): Result.Delete;

  /**
   * Creates a document of a specific content type based on the given ID and parameters.
   */
  create<TParams extends Params.Create<TContentTypeUID>>(
    params: TParams
  ): Result.Create<TContentTypeUID, TParams>;

  /**
   * Clones a document of a specific content type based on the given ID and parameters.
   *
   * @internal
   * This method is exposed for use within the Strapi Admin Panel and shouldn't be used outside.
   */
  clone<TParams extends Params.Clone<TContentTypeUID>>(
    documentId: ID,
    params: TParams
  ): Result.Clone<TContentTypeUID, TParams>;

  /**
   * Updates a document of a specific content type based on the given ID and parameters.
   */
  update<TParams extends Params.Update<TContentTypeUID>>(
    documentId: ID,
    params: TParams
  ): Result.Update<TContentTypeUID, TParams>;

  /**
   * Return the number of documents of a specific content type that matches the given parameters.
   */
  count<TParams extends Params.Count<TContentTypeUID>>(params?: TParams): Result.Count;
};

export type ServiceInstanceWithDraftAndPublish<
  TContentTypeUID extends UID.ContentType = UID.ContentType
> = Utils.Intersect<
  [
    BaseServiceInstance,
    {
      /**
       * Publish a document of a specific content type based on the given ID and parameters.
       */
      publish<TParams extends Params.Publish<TContentTypeUID>>(
        documentId: ID,
        params?: TParams
      ): Result.Publish<TContentTypeUID, TParams>;

      /**
       * Unpublish a document of a specific content type based on the given ID and parameters.
       */
      unpublish<TParams extends Params.Unpublish<TContentTypeUID>>(
        documentId: ID,
        params?: TParams
      ): Result.Unpublish<TContentTypeUID, TParams>;

      /**
       * Discard a document's draft version of a specific content type based on the given ID and parameters.
       */
      discardDraft<TParams extends Params.DiscardDraft<TContentTypeUID>>(
        documentId: ID,
        params?: TParams
      ): Result.DiscardDraft<TContentTypeUID, TParams>;
    }
  ]
>;
