import type { Data, Modules, UID } from '../src';
import type { FindOne } from '../src/modules/documents/params/document-engine';

declare const flavor: unique symbol;
type Flavor<T, N extends string> = T & { readonly [flavor]?: N };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface Identifiers {
        id: Flavor<string | number, 'ID'>;
        documentId: Flavor<string, 'DocumentID'>;
      }
    }
  }
}

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

export type Checks = [
  Expect<Equal<Data.ID, Flavor<string | number, 'ID'>>>,
  Expect<Equal<Data.DocumentID, Flavor<string, 'DocumentID'>>>,
  Expect<Equal<Modules.Documents.ID, Data.DocumentID>>,
  Expect<Equal<Modules.Documents.Params.Attribute.ID, Data.ID>>,
  Expect<Equal<Modules.Documents.Params.Attribute.DocumentID, Data.DocumentID>>,
  Expect<Equal<Data.ContentType<UID.ContentType>['id'], Data.ID>>,
  Expect<Equal<Data.ContentType<UID.ContentType>['documentId'], Data.DocumentID>>,
];

declare const id: Data.ID;
declare const documentId: Data.DocumentID;
declare const plain: string;

// Plain literals and primitives are still accepted as either kind.
'abc' satisfies Data.DocumentID;
1 satisfies Data.ID;
plain satisfies Data.ID;
plain satisfies Data.DocumentID;

// A value typed as one kind is rejected where the other is expected.
// @ts-expect-error A document id is not an entry id.
documentId satisfies Data.ID;
// @ts-expect-error An entry id is not a document id.
id satisfies Data.DocumentID;
// @ts-expect-error The Document Service addresses documents by document id.
({ documentId: id }) satisfies FindOne<UID.ContentType>;
({ documentId }) satisfies FindOne<UID.ContentType>;
