import type { Knex } from 'knex';
import { clone, isNil } from 'lodash/fp';
import type { Core, UID } from '@strapi/types';

import { ILink } from '../../types';

// TODO: Remove any types when we'll have types for DB metadata

const TARGET_EXISTS_ALIAS = '__target_exists';
const LEFT_EXISTS_ALIAS = '__left_exists';
const RIGHT_EXISTS_ALIAS = '__right_exists';
const EXISTENCE_CHECK_CHUNK_SIZE = 1000;

const getMetadataTableName = (strapi: Core.Strapi, uid: string) => {
  const metadata = strapi.db.metadata.get(uid);

  if (!metadata) {
    throw new Error(`No metadata found for ${uid}`);
  }

  return metadata.tableName;
};

const refKey = (ref: number | string) => `${typeof ref}:${ref}`;

/**
 * Batch-load which refs exist for a content type. Handles numeric `id` refs and
 * string `documentId` refs separately, chunked to keep `IN (...)` lists bounded.
 */
const loadExistingRefs = async (
  strapi: Core.Strapi,
  uid: string,
  refs: Array<number | string>
): Promise<Set<string>> => {
  const existing = new Set<string>();
  const uniqueRefs = [...new Set(refs)];
  const numericIds = uniqueRefs.filter((ref): ref is number => typeof ref === 'number');
  const documentIds = uniqueRefs.filter((ref): ref is string => typeof ref === 'string');

  for (let i = 0; i < numericIds.length; i += EXISTENCE_CHECK_CHUNK_SIZE) {
    const chunk = numericIds.slice(i, i + EXISTENCE_CHECK_CHUNK_SIZE);
    const rows = await strapi.db.query(uid as UID.Schema).findMany({
      select: ['id'],
      where: { id: { $in: chunk } },
    });

    for (const row of rows) {
      existing.add(refKey(row.id as number));
    }
  }

  for (let i = 0; i < documentIds.length; i += EXISTENCE_CHECK_CHUNK_SIZE) {
    const chunk = documentIds.slice(i, i + EXISTENCE_CHECK_CHUNK_SIZE);
    const rows = await strapi.db.query(uid as UID.Schema).findMany({
      select: ['id', 'documentId'],
      where: { documentId: { $in: chunk } },
    });

    for (const row of rows) {
      if (row.documentId != null) {
        existing.add(refKey(row.documentId as string));
      }
    }
  }

  return existing;
};

/**
 * Filter morph links in batches. The morph owner (`left`) is not checked:
 * morphColumn rows come from the owner table itself, and morph join-table
 * owners are FK-backed. Only dynamic morph targets (`right`) need existence
 * checks, and those have no DB-level FK.
 */
const filterMorphLinksByTargetExistence = async function* filterMorphLinksByTargetExistence(
  strapi: Core.Strapi,
  links: ILink[],
  onOrphanedLink?: (link: ILink) => void
): AsyncGenerator<ILink> {
  const refsByType = new Map<string, Array<number | string>>();

  for (const link of links) {
    const { type, ref } = link.right;

    if (ref == null || type == null) {
      onOrphanedLink?.(link);
    } else {
      const bucket = refsByType.get(type) ?? [];
      bucket.push(ref);
      refsByType.set(type, bucket);
    }
  }

  const existingByType = new Map<string, Set<string>>();

  for (const [type, refs] of refsByType) {
    existingByType.set(type, await loadExistingRefs(strapi, type, refs));
  }

  for (const link of links) {
    const { type, ref } = link.right;

    if (ref == null || type == null) {
      // already reported above
    } else if (existingByType.get(type)?.has(refKey(ref))) {
      yield link;
    } else {
      onOrphanedLink?.(link);
    }
  }
};

export interface LinkQueryOptions {
  onOrphanedLink?: (link: ILink) => void;
}

const aliasColumn = (tableAlias: string, column: string) => `${tableAlias}.${column}`;

const selectAliasedColumns = (tableAlias: string, columns: string[]) =>
  columns.map((column) => ({ [column]: aliasColumn(tableAlias, column) }));

export const createLinkQuery = (
  strapi: Core.Strapi,
  trx?: Knex.Transaction,
  options?: LinkQueryOptions
) => {
  const { onOrphanedLink } = options ?? {};

  const query = () => {
    const { connection } = strapi.db;

    // TODO: Export utils from database and use the addSchema that is already written
    const addSchema = (tableName: string) => {
      const schemaName = connection.client.connectionSettings.schema;
      return schemaName ? `${schemaName}.${tableName}` : tableName;
    };

    async function* generateAllForAttribute(uid: string, fieldName: string): AsyncGenerator<ILink> {
      const metadata = strapi.db.metadata.get(uid);

      if (!metadata) {
        throw new Error(`No metadata found for ${uid}`);
      }

      const attributes = filterValidRelationalAttributes(metadata.attributes);

      if (!(fieldName in attributes)) {
        throw new Error(`${fieldName} is not a valid relational attribute name`);
      }

      const attribute = attributes[fieldName];

      const kind = getLinkKind(attribute, uid);
      const { relation, target } = attribute;

      // The relation is stored in the same table
      // TODO: handle manyToOne joinColumn
      if (attribute.joinColumn) {
        const joinColumnName: string = attribute.joinColumn.name;
        const referencedColumn = attribute.joinColumn.referencedColumn ?? 'id';
        const ownerAlias = 'owner';
        const targetAlias = 'target';
        const ownerTable = addSchema(metadata.tableName);
        const targetTable = addSchema(getMetadataTableName(strapi, target));
        const targetReferencedColumn = aliasColumn(targetAlias, referencedColumn);

        // One LEFT JOIN classifies valid vs orphan rows (avoids a second full scan).
        // When warnings are not requested, INNER JOIN skips orphans at the DB.
        const qb = connection
          .queryBuilder()
          .select(
            `${ownerAlias}.id`,
            `${ownerAlias}.${joinColumnName} as ${joinColumnName}`,
            ...(onOrphanedLink ? [{ [TARGET_EXISTS_ALIAS]: targetReferencedColumn }] : [])
          )
          .from({ [ownerAlias]: ownerTable });

        if (onOrphanedLink) {
          qb.leftJoin(
            { [targetAlias]: targetTable },
            aliasColumn(ownerAlias, joinColumnName),
            targetReferencedColumn
          );
        } else {
          qb.innerJoin(
            { [targetAlias]: targetTable },
            aliasColumn(ownerAlias, joinColumnName),
            targetReferencedColumn
          );
        }

        qb.whereNotNull(aliasColumn(ownerAlias, joinColumnName));

        if (trx) {
          qb.transacting(trx);
        }

        // TODO: stream the query to improve performances
        const entries = await qb;

        for (const entry of entries) {
          const ref = entry[joinColumnName];
          const link: ILink = {
            kind,
            relation,
            left: { type: uid, ref: entry.id, field: fieldName },
            right: { type: target, ref },
          };

          if (onOrphanedLink && entry[TARGET_EXISTS_ALIAS] == null) {
            onOrphanedLink(link);
          } else {
            yield link;
          }
        }
      }

      // The relation uses a join table
      if (attribute.joinTable) {
        const {
          name,
          joinColumn,
          inverseJoinColumn,
          orderColumnName,
          morphColumn,
          inverseOrderColumnName,
        } = attribute.joinTable;

        type Columns = {
          left: { ref: string | null; order?: string };
          right: { ref: string | null; order?: string; type?: string; field?: string };
        };

        const columns: Columns = {
          left: { ref: null },
          right: { ref: null },
        };

        const left: Partial<ILink['left']> = { type: uid, field: fieldName };
        const right: Partial<ILink['right']> = {};

        if (kind === 'relation.basic' || kind === 'relation.circular') {
          right.type = attribute.target;
          right.field = attribute.inversedBy;

          columns.left.ref = joinColumn.name;
          columns.right.ref = inverseJoinColumn.name;

          if (orderColumnName) {
            columns.left.order = orderColumnName as string;
          }

          if (inverseOrderColumnName) {
            columns.right.order = inverseOrderColumnName as string;
          }

          const joinAlias = 'join';
          const leftAlias = 'left';
          const rightAlias = 'right';
          const joinTable = addSchema(name);
          const leftTable = addSchema(metadata.tableName);
          const rightTable = addSchema(getMetadataTableName(strapi, attribute.target));
          const leftReferencedColumn = aliasColumn(leftAlias, joinColumn.referencedColumn ?? 'id');
          const rightReferencedColumn = aliasColumn(
            rightAlias,
            inverseJoinColumn.referencedColumn ?? 'id'
          );

          const validColumns = [
            columns.left.ref,
            columns.left.order,
            columns.right.ref,
            columns.right.order,
          ].filter((column: string | null | undefined) => !isNil(column)) as string[];

          const buildJoinTableLink = (entry: Record<string, unknown>): ILink => {
            const linkLeft: Partial<ILink['left']> = { type: uid, field: fieldName };
            const linkRight: Partial<ILink['right']> = {
              type: attribute.target,
              field: attribute.inversedBy,
            };

            if (columns.left.ref) {
              linkLeft.ref = entry[columns.left.ref] as number;
            }

            if (columns.right.ref) {
              linkRight.ref = entry[columns.right.ref] as number;
            }

            if (columns.left.order) {
              linkLeft.pos = entry[columns.left.order] as number;
            }

            if (columns.right.order) {
              linkRight.pos = entry[columns.right.order] as number;
            }

            return {
              kind,
              relation,
              left: clone(linkLeft as ILink['left']),
              right: clone(linkRight as ILink['right']),
            };
          };

          const selectColumns = [
            ...selectAliasedColumns(joinAlias, validColumns),
            ...(onOrphanedLink
              ? [
                  { [LEFT_EXISTS_ALIAS]: leftReferencedColumn },
                  { [RIGHT_EXISTS_ALIAS]: rightReferencedColumn },
                ]
              : []),
          ];

          const joinQb = connection
            .queryBuilder()
            .select(selectColumns)
            .from({ [joinAlias]: joinTable });

          if (onOrphanedLink) {
            joinQb
              .leftJoin(
                { [leftAlias]: leftTable },
                aliasColumn(joinAlias, joinColumn.name),
                leftReferencedColumn
              )
              .leftJoin(
                { [rightAlias]: rightTable },
                aliasColumn(joinAlias, inverseJoinColumn.name),
                rightReferencedColumn
              );
          } else {
            joinQb
              .innerJoin(
                { [leftAlias]: leftTable },
                aliasColumn(joinAlias, joinColumn.name),
                leftReferencedColumn
              )
              .innerJoin(
                { [rightAlias]: rightTable },
                aliasColumn(joinAlias, inverseJoinColumn.name),
                rightReferencedColumn
              );
          }

          if (trx) {
            joinQb.transacting(trx);
          }

          const entries = await joinQb;

          for (const entry of entries) {
            const link = buildJoinTableLink(entry);

            if (
              onOrphanedLink &&
              (entry[LEFT_EXISTS_ALIAS] == null || entry[RIGHT_EXISTS_ALIAS] == null)
            ) {
              onOrphanedLink(link);
            } else {
              yield link;
            }
          }
        }

        if (kind === 'relation.morph') {
          const qb = connection.queryBuilder().from(addSchema(name));

          columns.left.ref = joinColumn.name;

          columns.right.ref = morphColumn.idColumn.name;
          columns.right.type = morphColumn.typeColumn.name;
          columns.right.field = 'field';
          columns.right.order = 'order';

          const validColumns = [
            columns.left.ref,
            columns.left.order,
            columns.right.ref,
            columns.right.type,
            columns.right.field,
            columns.right.order,
          ].filter((column: string | null | undefined) => !isNil(column));

          qb.select(validColumns);

          if (trx) {
            qb.transacting(trx);
          }

          // TODO: stream the query to improve performances
          const entries = await qb;
          const morphLinks: ILink[] = [];

          for (const entry of entries) {
            if (columns.left.ref) {
              left.ref = entry[columns.left.ref];
            }

            if (columns.right.ref) {
              right.ref = entry[columns.right.ref];
            }

            if (columns.left.order) {
              left.pos = entry[columns.left.order as string];
            }

            if (columns.right.order) {
              right.pos = entry[columns.right.order as string];
            }

            if (columns.right.type) {
              right.type = entry[columns.right.type as string];
            }

            if (columns.right.field) {
              right.field = entry[columns.right.field as string];
            }

            morphLinks.push({
              kind,
              relation,
              left: clone(left as ILink['left']),
              right: clone(right as ILink['right']),
            });
          }

          yield* filterMorphLinksByTargetExistence(strapi, morphLinks, onOrphanedLink);
        }
      }

      if (attribute.morphColumn) {
        const { typeColumn, idColumn } = attribute.morphColumn;

        const qb = connection
          .queryBuilder()
          .select('id', typeColumn.name, idColumn.name)
          .from(addSchema(metadata.tableName))
          .whereNotNull(typeColumn.name)
          .whereNotNull(idColumn.name);

        if (trx) {
          qb.transacting(trx);
        }

        const entries = await qb;
        const morphLinks: ILink[] = entries.map((entry: Record<string, unknown>) => ({
          kind,
          relation,
          left: { type: uid, ref: entry.id as number, field: fieldName },
          right: { type: entry[typeColumn.name] as string, ref: entry[idColumn.name] as number },
        }));

        yield* filterMorphLinksByTargetExistence(strapi, morphLinks, onOrphanedLink);
      }
    }

    async function* generateAll(uid: string): AsyncGenerator<ILink> {
      const metadata = strapi.db.metadata.get(uid);

      if (!metadata) {
        throw new Error(`No metadata found for ${uid}`);
      }

      const attributes = filterValidRelationalAttributes(metadata.attributes);

      for (const fieldName of Object.keys(attributes)) {
        for await (const link of generateAllForAttribute(uid, fieldName)) {
          yield link;
        }
      }
    }

    const insert = async (link: ILink) => {
      const { kind, left, right } = link;

      const metadata = strapi.db.metadata.get(left.type);
      const attribute = metadata.attributes[left.field];

      const payload = {};

      /**
       * This _should_ only happen for attributes that are added dynamically e.g. review-workflow stages
       * and a user is importing EE data into a CE project.
       */
      if (!attribute) {
        return;
      }

      if (attribute.type !== 'relation') {
        throw new Error(`Attribute ${left.field} is not a relation`);
      }

      if ('joinColumn' in attribute && attribute.joinColumn) {
        const joinColumnName = attribute.joinColumn.name;

        // Note: this addSchema may not be necessary, but is added for safety
        const qb = connection(addSchema(metadata.tableName))
          .where('id', left.ref)
          .update({ [joinColumnName]: right.ref });
        if (trx) {
          qb.transacting(trx);
        }
        await qb;
      }

      if ('joinTable' in attribute && attribute.joinTable) {
        const { joinTable } = attribute;

        if (joinTable.joinColumn) {
          Object.assign(payload, { [joinTable.joinColumn.name]: left.ref });
        }

        const assignInverseColumn = () => {
          if ('inverseJoinColumn' in joinTable && joinTable.inverseJoinColumn) {
            Object.assign(payload, {
              [joinTable.inverseJoinColumn.name]: right.ref,
            });
          }
        };

        const assignOrderColumns = () => {
          if ('orderColumnName' in joinTable && joinTable.orderColumnName) {
            Object.assign(payload, { [joinTable.orderColumnName]: left.pos ?? null });
          }

          if ('inverseOrderColumnName' in joinTable && joinTable.inverseOrderColumnName) {
            Object.assign(payload, { [joinTable.inverseOrderColumnName]: right.pos ?? null });
          }
        };

        const assignMorphColumns = () => {
          if ('morphColumn' in joinTable && joinTable.morphColumn) {
            const { idColumn, typeColumn } = joinTable.morphColumn ?? {};

            if (idColumn) {
              Object.assign(payload, { [idColumn.name]: right.ref });
            }

            if (typeColumn) {
              Object.assign(payload, { [typeColumn.name]: right.type });
            }

            Object.assign(payload, { order: right.pos ?? null, field: right.field ?? null });
          }
        };

        if (kind === 'relation.basic' || kind === 'relation.circular') {
          assignInverseColumn();
        }

        if (kind === 'relation.morph') {
          assignMorphColumns();
        }

        assignOrderColumns();
        const qb = connection.insert(payload).into(addSchema(joinTable.name));
        if (trx) {
          await qb.transacting(trx);
        }
      }

      if ('morphColumn' in attribute && attribute.morphColumn) {
        const { morphColumn } = attribute;

        const qb = connection(addSchema(metadata.tableName))
          .where('id', left.ref)
          .update({
            [morphColumn.idColumn.name]: right.ref,
            [morphColumn.typeColumn.name]: right.type,
          });

        if (trx) {
          qb.transacting(trx);
        }

        await qb;
      }
    };

    return { generateAll, generateAllForAttribute, insert };
  };

  return query;
};

export const filterValidRelationalAttributes = (attributes: Record<string, any>) => {
  const isOwner = (attribute: any) => {
    return attribute.owner || (!attribute.mappedBy && !attribute.morphBy);
  };

  const isComponentLike = (attribute: any) => attribute.joinTable?.name.endsWith('_cmps');

  return Object.entries(attributes)
    .filter(([, attribute]) => {
      return attribute.type === 'relation' && isOwner(attribute) && !isComponentLike(attribute);
    })
    .reduce<Record<string, any>>((acc, [key, attribute]) => ({ ...acc, [key]: attribute }), {});
};

const getLinkKind = (attribute: any, uid: string): ILink['kind'] => {
  if (attribute.relation.startsWith('morph')) {
    return 'relation.morph';
  }

  if (attribute.target === uid) {
    return 'relation.circular';
  }

  return 'relation.basic';
};
