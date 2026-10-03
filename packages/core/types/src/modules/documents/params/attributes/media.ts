import type { ID } from '../../../../data';
import type * as Schema from '../../../../schema';
import type { If } from '../../../../utils';

type MediaReference = ID | { id: ID };

type MediaConnectReference =
  | ID
  | {
      id: ID;
      position?: { before?: ID; after?: ID; start?: boolean; end?: boolean };
    };

type MediaUpdate =
  | { set: MediaReference[] | null }
  | {
      connect?: MediaConnectReference[];
      disconnect?: MediaReference[];
    };

/**
 * Media writes refer to existing upload files by database ID. They do not require
 * a populated file entity or a documentId, even when the upload schema is known.
 */
export type GetMediaInputValue<TAttribute extends Schema.Attribute.Attribute> =
  TAttribute extends Schema.Attribute.Media<Schema.Attribute.MediaKind | undefined, infer TMultiple>
    ? If<TMultiple, MediaReference[], MediaReference> | MediaUpdate | null
    : never;
