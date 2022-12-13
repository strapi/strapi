import type { SchemaUID } from '@strapi/strapi/lib/types/utils';
import { Writable } from 'stream';

import type { IEntity } from '../../../../../types';
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

      try {
        const created = await query(type).create({ data });

        updateMappingTable(type, id, created.id);
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
