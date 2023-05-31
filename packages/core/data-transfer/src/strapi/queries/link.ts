import { clone, isNil } from 'lodash/fp';
import { ILink, KnexTransaction } from '../../../types';

// TODO: Remove any types when we'll have types for DB metadata

export const createLinkQuery = (strapi: Strapi.Strapi, trx?: KnexTransaction) => {
  const query = () => {
    const { connection } = strapi.db;

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

        const qb = connection.queryBuilder().select('id', joinColumnName).from(metadata.tableName);

        if (trx) {
          qb.transacting(trx);
        }

        // TODO: stream the query to improve performances
        const entries = await qb;

        for (const entry of entries) {
          const ref = entry[joinColumnName];

          if (ref !== null) {
            yield {
              kind,
              relation,
              left: { type: uid, ref: entry.id, field: fieldName },
              right: { type: target, ref },
            };
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

        const qb = connection.queryBuilder().from(name);

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
        }

        if (kind === 'relation.morph') {
          columns.left.ref = joinColumn.name;

          columns.right.ref = morphColumn.idColumn.name;
          columns.right.type = morphColumn.typeColumn.name;
          columns.right.field = 'field';
          columns.right.order = 'order';
        }

        const validColumns = [
          // Left
          columns.left.ref,
          columns.left.order,
          // Right
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

          yield link;
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

      if (attribute.joinColumn) {
        const joinColumnName = attribute.joinColumn.name;
        const qb = connection(metadata.tableName)
          .where('id', left.ref)
          .update({ [joinColumnName]: right.ref });
        if (trx) {
          qb.transacting(trx);
        }
        await qb;
      }

      if (attribute.joinTable) {
        const {
          name,
          joinColumn,
          inverseJoinColumn,
          orderColumnName,
          inverseOrderColumnName,
          morphColumn,
        } = attribute.joinTable;

        if (joinColumn) {
          Object.assign(payload, { [joinColumn.name]: left.ref });
        }

        const assignInverseColumn = () => {
          if (inverseJoinColumn) {
            Object.assign(payload, {
              [inverseJoinColumn.name]: right.ref,
            });
          }
        };

        const assignOrderColumns = () => {
          if (orderColumnName) {
            Object.assign(payload, { [orderColumnName]: left.pos ?? null });
          }

          if (inverseOrderColumnName) {
            Object.assign(payload, { [inverseOrderColumnName]: right.pos ?? null });
          }
        };

        const assignMorphColumns = () => {
          const { idColumn, typeColumn } = morphColumn ?? {};

          if (idColumn) {
            Object.assign(payload, { [idColumn.name]: right.ref });
          }

          if (typeColumn) {
            Object.assign(payload, { [typeColumn.name]: right.type });
          }

          Object.assign(payload, { order: right.pos ?? null, field: right.field ?? null });
        };

        if (kind === 'relation.basic' || kind === 'relation.circular') {
          assignInverseColumn();
        }

        if (kind === 'relation.morph') {
          assignMorphColumns();
        }

        assignOrderColumns();

        const qb = connection.insert(payload).into(name);
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

const filterValidRelationalAttributes = (attributes: Record<string, any>) => {
  const isOwner = (attribute: any) => {
    return attribute.owner || (!attribute.mappedBy && !attribute.morphBy);
  };

  const isComponentLike = (attribute: any) => {
    return attribute.component || attribute.components;
  };

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
