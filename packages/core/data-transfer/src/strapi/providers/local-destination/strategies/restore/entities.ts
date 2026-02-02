import { Writable } from 'stream';
import type { Core, UID } from '@strapi/types';

import { last } from 'lodash/fp';

import { ProviderTransferError } from '../../../../../errors/providers';
import type { IEntity, Transaction } from '../../../../../../types';
import { json } from '../../../../../utils';
import * as queries from '../../../../queries';
import { resolveComponentUID } from '../../../../../utils/components';

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

          // Compute differences between original & new entities
          const diffs = json.diff(data, created);

          updateMappingTable(type, id, created.id);

          // For each difference found on an ID attribute,
          // update the mapping the table accordingly
          diffs.forEach((diff) => {
            if (diff.kind === 'modified' && last(diff.path) === 'id' && 'kind' in contentType) {
              const target = resolveComponentUID({ paths: diff.path, data, contentType, strapi });

              // If no type is found for the given path, then ignore the diff
              if (!target) {
                return;
              }

              const [oldID, newID] = diff.values as [number, number];

              updateMappingTable(target, oldID, newID);
            }
          });
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
