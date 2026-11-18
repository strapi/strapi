/**
 * `status` on `delete` params when the schema registries are not extended, as in an app without
 * generated types.
 *
 * Compiled on its own by `delete-status.vitest.test.ts`, which asserts that it type-checks
 * without errors: draft and publish is unknown, so every status is accepted with a known UID.
 */
import type { Modules, UID } from '../../../../../..';

declare const documents: Modules.Documents.Service;
declare const documentId: string;
declare const anyContentTypeUID: UID.ContentType;

documents('api::article.article').delete({ documentId });
documents('api::article.article').delete({ documentId, status: 'published' });
documents('api::article.article').delete({ documentId, status: 'draft' });

documents(anyContentTypeUID).delete({ documentId, status: 'published' });
documents(anyContentTypeUID).delete({ documentId, status: 'draft' });

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
