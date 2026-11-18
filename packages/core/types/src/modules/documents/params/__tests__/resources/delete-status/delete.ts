/**
 * `status` checked on `delete` params, per content type.
 *
 * Compiled on its own by `delete-status.vitest.test.ts`, which asserts that it type-checks
 * without errors.
 */
import type { Modules, UID } from '../../../../../..';

declare const documents: Modules.Documents.Service;
declare const documentId: string;
declare const status: Modules.Documents.Params.PublicationStatus.Kind;

/**
 * Draft and publish enabled: deleting the draft version alone always throws
 * (`Cannot delete a draft document`), and the `published` status is ignored
 */
documents('api::article.article').delete({ documentId });
documents('api::article.article').delete({ documentId, status: 'published' });
documents('api::article.article').delete({ documentId, status: undefined });
documents('api::article.article').delete({
  documentId,
  // @ts-expect-error A draft and publish document cannot be deleted by its draft version
  status: 'draft',
});

export const articleParams: Modules.Documents.ServiceParams<'api::article.article'>['delete'][] = [
  { documentId, status: 'published' },
  {
    documentId,
    // @ts-expect-error A draft and publish document cannot be deleted by its draft version
    status: 'draft',
  },
];

/**
 * Draft and publish disabled: every status is accepted, as before
 */
documents('api::tag.tag').delete({ documentId });
documents('api::tag.tag').delete({ documentId, status: 'published' });
documents('api::tag.tag').delete({ documentId, status: 'draft' });
documents('api::tag.tag').delete({ documentId, status });

// A `status` attribute stays a regular attribute in filters
documents('api::tag.tag').delete({ documentId, filters: { status: 'archived' } });

/**
 * No `options` in the schema: draft and publish is disabled, as at runtime
 */
documents('api::homepage.homepage').delete({ documentId, status: 'published' });
documents('api::homepage.homepage').delete({ documentId, status: 'draft' });

/**
 * A content type UID only known at runtime keeps every status
 */
declare const anyContentTypeUID: UID.ContentType;

documents(anyContentTypeUID).delete({ documentId });
documents(anyContentTypeUID).delete({ documentId, status: 'published' });
documents(anyContentTypeUID).delete({ documentId, status: 'draft' });
documents(anyContentTypeUID).delete({ documentId, status });

/**
 * Code generic over the content type UID: `published` is accepted for every content type. `draft`
 * is not, because it throws if the content type has draft and publish enabled.
 */
export const deleteDocument = <TContentTypeUID extends UID.ContentType>(uid: TContentTypeUID) =>
  documents(uid).delete({ documentId, locale: 'en' });

export const deletePublished = <TContentTypeUID extends UID.ContentType>(uid: TContentTypeUID) =>
  documents(uid).delete({ documentId, status: 'published' });

export const deleteDraft = <TContentTypeUID extends UID.ContentType>(uid: TContentTypeUID) =>
  documents(uid).delete({
    documentId,
    // @ts-expect-error Throws if the content type has draft and publish enabled
    status: 'draft',
  });

export const deleteWithStatus = <TContentTypeUID extends UID.ContentType>(uid: TContentTypeUID) =>
  documents(uid).delete({
    documentId,
    // @ts-expect-error Throws if the content type has draft and publish enabled and status is `draft`
    status,
  });
