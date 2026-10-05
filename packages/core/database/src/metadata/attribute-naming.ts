import { snakeCase } from 'lodash/fp';

import { identifiers } from '../utils/identifiers';

/**
 * The rules that turn an attribute's logical name into the physical database
 * identifiers it maps to. This is the only place those rules live: the metadata
 * loader (`metadata.ts`, `relations.ts`) uses them when registering models, and
 * callers that need to predict a name for an attribute that is not registered
 * yet — e.g. the Content-Type Builder computing the *new* side of a rename
 * migration before the server reloads — use them too, so the two can never
 * drift apart.
 *
 * Components, dynamic zones and media do not derive a physical identifier from
 * the attribute name: the name itself is stored as a value in the link table's
 * `field` column (`identifiers.FIELD_COLUMN`).
 */
export const attributeNaming = {
  /**
   * Column on the model's own table for a scalar attribute.
   */
  columnName(attributeName: string): string {
    return identifiers.getColumnName(snakeCase(attributeName));
  },

  /**
   * Column on the model's own table for a relation stored as a join column
   * (`<attribute>_id`, i.e. `useJoinTable: false` or an owning x-to-one).
   */
  joinColumnName(attributeName: string): string {
    return identifiers.getJoinColumnAttributeIdName(snakeCase(attributeName));
  },

  /**
   * Join/link table for a relation owned by `attributeName` on the model whose
   * table is `tableName`.
   */
  joinTableName(tableName: string, attributeName: string): string {
    return identifiers.getJoinTableName(snakeCase(tableName), snakeCase(attributeName));
  },
};

export type AttributeNaming = typeof attributeNaming;
