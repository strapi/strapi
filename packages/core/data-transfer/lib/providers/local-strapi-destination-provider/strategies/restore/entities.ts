import type { SchemaUID } from '@strapi/strapi/lib/types/utils';

import { get } from 'lodash/fp';
import { Writable } from 'stream';

import type { IEntity } from '../../../../../types';
import { json } from '../../../../utils';
import * as shared from '../../../shared';

interface IEntitiesRestoreStreamOptions {
  strapi: Strapi.Strapi;
  updateMappingTable<T extends SchemaUID | string>(type: T, oldID: number, newID: number): void;
}

const createEntitiesWriteStream = (options: IEntitiesRestoreStreamOptions) => {
  const { strapi, updateMappingTable } = options;
  const query = shared.strapi.entity.createEntityQuery(strapi);

  return new Writable({
    objectMode: true,

    async write(entity: IEntity, _encoding, callback) {
      const { type, id, data } = entity;
      const { create, getDeepPopulateComponentLikeQuery } = query(type);
      const contentType = strapi.getModel(type);

      const resolveType = (paths: string[]) => {
        let cType = contentType;
        let value: unknown = data;

        for (const path of paths) {
          value = get(path, value);

          if (typeof cType === 'function') {
            cType = cType(value);
          }

          if (path in cType.attributes) {
            const attribute = cType.attributes[path];

            if (attribute.type === 'component') {
              cType = strapi.getModel(attribute.component);
            }

            if (attribute.type === 'dynamiczone') {
              cType = ({ __component }: { __component: string }) => strapi.getModel(__component);
            }
          }
        }

        return cType.uid;
      };

      try {
        // Create the entity
        const created = await create({
          data,
          populate: getDeepPopulateComponentLikeQuery(contentType, { select: 'id' }),
          select: 'id',
        });

        const diffs = json.diff(data, created);

        updateMappingTable(type, id, created.id);

        diffs.forEach((diff) => {
          if (diff.kind === 'modified' && diff.path.at(-1) === 'id') {
            const target = resolveType(diff.path);
            const [oldID, newID] = diff.values as [number, number];

            updateMappingTable(target, oldID, newID);
          }
        });
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

export { createEntitiesWriteStream };
