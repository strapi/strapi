import type { Knex } from 'knex';
import { clone, isNil } from 'lodash/fp';
import type { Core, UID } from '@strapi/types';

import { ILink } from '../../types';

// TODO: Remove any types when we'll have types for DB metadata

const getMetadataTableName = (strapi: Core.Strapi, uid: string) => {
  const metadata = strapi.db.metadata.get(uid);

  if (!metadata) {
    throw new Error(`No metadata found for ${uid}`);
  }

  return metadata.tableName;
};

const entityExists = async (
  strapi: Core.Strapi,
  uid: string,
  ref: number | string | null | undefined
) => {
  if (ref == null) {
    return false;
  }

  const where = typeof ref === 'number' ? { id: ref } : { documentId: ref };

  const entry = await strapi.db.query(uid as UID.Schema).findOne({ select: ['id'], where });

  return entry != null;
};

const linkReferencesExistingEntities = async (strapi: Core.Strapi, link: ILink) => {
  const leftExists = await entityExists(strapi, link.left.type, link.left.ref);
  const rightExists = await entityExists(strapi, link.right.type, link.right.ref);

  return leftExists && rightExists;
};

export interface LinkQueryOptions {
  onOrphanedLink?: (link: ILink) => void;
}

const yieldLinkIfEntitiesExist = async (
  strapi: Core.Strapi,
  link: ILink,
  onOrphanedLink?: (link: ILink) => void
) => {
  if (await linkReferencesExistingEntities(strapi, link)) {
    return link;
  }

  onOrphanedLink?.(link);
  return null;
};

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

        if (onOrphanedLink) {
          const orphanQb = connection
            .queryBuilder()
            .select(`${ownerAlias}.id`, `${ownerAlias}.${joinColumnName} as ${joinColumnName}`)
            .from({ [ownerAlias]: ownerTable })
            .leftJoin(
              { [targetAlias]: targetTable },
              aliasColumn(ownerAlias, joinColumnName),
              targetReferencedColumn
            )
            .whereNotNull(aliasColumn(ownerAlias, joinColumnName))
            .whereNull(targetReferencedColumn);

          if (trx) {
            orphanQb.transacting(trx);
          }

          const orphanedEntries = await orphanQb;

          for (const entry of orphanedEntries) {
            const ref = entry[joinColumnName];

            onOrphanedLink({
              kind,
              relation,
              left: { type: uid, ref: entry.id, field: fieldName },
              right: { type: target, ref },
            });
          }
        }

        const qb = connection
          .queryBuilder()
          .select(`${ownerAlias}.id`, `${ownerAlias}.${joinColumnName} as ${joinColumnName}`)
          .from({ [ownerAlias]: ownerTable })
          .innerJoin(
            { [targetAlias]: targetTable },
            aliasColumn(ownerAlias, joinColumnName),
            targetReferencedColumn
          )
          .whereNotNull(aliasColumn(ownerAlias, joinColumnName));

        if (trx) {
          qb.transacting(trx);
        }

        // TODO: stream the query to improve performances
        const entries = await qb;

        for (const entry of entries) {
          const ref = entry[joinColumnName];

          yield {
            kind,
            relation,
            left: { type: uid, ref: entry.id, field: fieldName },
            right: { type: target, ref },
          };
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

        const qb = connection.queryBuilder().from(addSchema(name));

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

          if (onOrphanedLink) {
            const orphanQb = connection
              .queryBuilder()
              .select(selectAliasedColumns(joinAlias, validColumns))
              .from({ [joinAlias]: joinTable })
              .leftJoin(
                { [leftAlias]: leftTable },
                aliasColumn(joinAlias, joinColumn.name),
                leftReferencedColumn
              )
              .leftJoin(
                { [rightAlias]: rightTable },
                aliasColumn(joinAlias, inverseJoinColumn.name),
                rightReferencedColumn
              )
              .where((builder) => {
                builder.whereNull(leftReferencedColumn).orWhereNull(rightReferencedColumn);
              });

            if (trx) {
              orphanQb.transacting(trx);
            }

            const orphanedEntries = await orphanQb;

            for (const entry of orphanedEntries) {
              onOrphanedLink(buildJoinTableLink(entry));
            }
          }

          const qb = connection
            .queryBuilder()
            .select(selectAliasedColumns(joinAlias, validColumns))
            .from({ [joinAlias]: joinTable })
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

          if (trx) {
            qb.transacting(trx);
          }

          const entries = await qb;

          for (const entry of entries) {
            yield buildJoinTableLink(entry);
          }
        }

        if (kind === 'relation.morph') {
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

            const link: ILink = {
              kind,
              relation,
              left: clone(left as ILink['left']),
              right: clone(right as ILink['right']),
            };

            const validLink = await yieldLinkIfEntitiesExist(strapi, link, onOrphanedLink);

            if (validLink) {
              yield validLink;
            }
          }
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

        for (const entry of entries) {
          const ref = entry[idColumn.name];

          const link = {
            kind,
            relation,
            left: { type: uid, ref: entry.id, field: fieldName },
            right: { type: entry[typeColumn.name], ref },
          };

          const validLink = await yieldLinkIfEntitiesExist(strapi, link, onOrphanedLink);

          if (validLink) {
            yield validLink;
          }
        }
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
