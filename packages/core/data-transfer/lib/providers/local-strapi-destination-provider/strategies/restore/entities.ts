import type { SchemaUID } from '@strapi/strapi/lib/types/utils';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { traverseEntity } from '@strapi/utils';
import { castArray, get } from 'lodash/fp';
import { Writable } from 'stream';

import type { IEntity } from '../../../../../types';
import * as shared from '../../../shared';

interface IEntitiesRestoreStreamOptions {
  strapi: Strapi.Strapi;
  updateMappingTable<T extends SchemaUID | string>(type: T, oldID: number, newID: number): void;
}

type EntityIDMap = { [path: string]: { type: string; old?: number; new?: number } };

const createEntitiesWriteStream = (options: IEntitiesRestoreStreamOptions) => {
  const { strapi, updateMappingTable } = options;
  const query = shared.strapi.entity.createEntityQuery(strapi);

  return new Writable({
    objectMode: true,

    async write(entity: IEntity, _encoding, callback) {
      const { type, id, data } = entity;
      const { create, getDeepPopulateComponentLikeQuery } = query(type);
      const contentType = strapi.getModel(type);

      const ids: EntityIDMap = {
        // Register current entity ID
        id: { type, old: id },
      };

      const extractOldIDs = extractEntityIDs(ids, 'old');
      const extractNewIDs = extractEntityIDs(ids, 'new');

      try {
        // Register old IDs
        await traverseEntity(extractOldIDs, { schema: contentType }, data);

        // Create the entity
        const created = await create({
          data,
          populate: getDeepPopulateComponentLikeQuery(contentType, { select: 'id' }),
          select: 'id',
        });

        // Register new IDs
        ids.id.new = parseInt(created.id, 10);
        await traverseEntity(extractNewIDs, { schema: contentType }, created);

        // Save old/new IDs in the mapping table
        for (const idMap of Object.values(ids)) {
          const { new: newID, old: oldID } = idMap;

          if (oldID && newID) {
            updateMappingTable(idMap.type, oldID, newID);
          }
        }
      } catch (e) {
        if (e instanceof Error) {
          return callback(e);
        }

        return callback(new Error(`Failed to create "${type}" (${id})`));
      }

      return callback(null);
    },
  });
};

const extractEntityIDs = (ids: EntityIDMap, property: 'old' | 'new') => (opts: any) => {
  const { path, attribute, value } = opts;

  const extract = (type: string, id: string) => {
    const parsedID = parseInt(id, 10);

    if (!(path in ids)) {
      Object.assign(ids, { [path]: { type } });
    }

    Object.assign(ids[path], { [property]: parsedID });
  };

  if (attribute.type === 'component') {
    const { component } = attribute;

    castArray(value)
      .map(get('id'))
      .forEach((componentID: string) => extract(component, componentID));
  }

  if (attribute.type === 'dynamiczone') {
    value.forEach((item: { __component: string; id: string }) =>
      extract(item.__component, item.id)
    );
  }
};

export { createEntitiesWriteStream };
