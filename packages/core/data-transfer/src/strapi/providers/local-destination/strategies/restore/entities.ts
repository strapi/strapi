import { Writable } from 'stream';
import type { Core, UID } from '@strapi/types';

import { ProviderTransferError } from '../../../../../errors/providers';
import type { IEntity, Transaction } from '../../../../../types';
import * as queries from '../../../../queries';
import { collectComponentIdMappings } from '../../../../../utils/components';

interface IEntitiesRestoreStreamOptions {
  strapi: Core.Strapi;
  updateMappingTable<TSchemaUID extends UID.Schema>(
    type: TSchemaUID,
    oldID: number,
    newID: number
  ): void;
  transaction?: Transaction;
}

export const createEntitiesWriteStream = (options: IEntitiesRestoreStreamOptions) => {
  const { strapi, updateMappingTable, transaction } = options;
  const query = queries.entity.createEntityQuery(strapi);

  return new Writable({
    objectMode: true,

    async write(entity: IEntity, _encoding, callback) {
      await transaction?.attach(async () => {
        const { type, id, data } = entity;
        const { create, getDeepPopulateComponentLikeQuery } = query(type);
        const contentType = strapi.getModel(type);

        try {
          const created = await create({
            data,
            populate: getDeepPopulateComponentLikeQuery(contentType, { select: 'id' }),
            select: 'id',
          });

          updateMappingTable(type, id, created.id);

          // Register the ID of every component instance that was re-created
          // with the entity — including the ones whose ID did not change — so
          // that the links stage can resolve component-side references and
          // tell transferred components apart from missing/orphaned ones
          const componentMappings = collectComponentIdMappings({
            data,
            created,
            schema: contentType,
            strapi,
          });

          for (const { uid, oldID, newID } of componentMappings) {
            updateMappingTable(uid, oldID, newID);
          }
        } catch (e) {
          if (e instanceof Error) {
            return callback(e);
          }

          return callback(new ProviderTransferError(`Failed to create "${type}" (${id})`));
        }

        return callback(null);
      });
    },
  });
};
