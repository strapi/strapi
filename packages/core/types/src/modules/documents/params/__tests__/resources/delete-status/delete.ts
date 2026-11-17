/**
 * `status` checked on `delete` params, per content type.
 *
 * Compiled on its own by `delete-status.vitest.test.ts`, which asserts that it type-checks
 * without errors.
 */
import type { Modules, UID } from '../../../../../..';

declare const documents: Modules.Documents.Service;
declare const documentId: string;

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
 * Draft and publish disabled: a document has no publication status
 */
documents('api::tag.tag').delete({ documentId });
documents('api::tag.tag').delete({
  documentId,
  // @ts-expect-error A content type without draft and publish has no publication status
  status: 'published',
});
documents('api::tag.tag').delete({
  documentId,
  // @ts-expect-error A content type without draft and publish has no publication status
  status: 'draft',
});

// A `status` attribute stays a regular attribute in filters
documents('api::tag.tag').delete({ documentId, filters: { status: 'archived' } });

/**
 * No `options` in the schema: draft and publish is unknown to the types, so every status is
 * accepted (e.g. `plugin::users-permissions.user`, `plugin::upload.file`)
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

/**
 * Code generic over the content type UID
 */
export const deleteDocument = <TContentTypeUID extends UID.ContentType>(uid: TContentTypeUID) =>
  documents(uid).delete({ documentId, locale: 'en' });

export const deleteWithStatus = <TContentTypeUID extends UID.ContentType>(uid: TContentTypeUID) =>
  documents(uid).delete({
    documentId,
    // @ts-expect-error The status depends on the content type, unknown until the UID is
    status: 'published',
  });
