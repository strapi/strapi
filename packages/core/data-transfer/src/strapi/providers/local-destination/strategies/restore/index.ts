import type { ContentTypeSchema } from '@strapi/strapi';
import { ProviderTransferError } from '../../../../../errors/providers';
import * as queries from '../../../../queries';

export interface IRestoreOptions {
  assets?: boolean;
  configuration?: {
    webhook?: boolean;
    coreStore?: boolean;
  };
  entities?: {
    include?: string[];
    exclude?: string[];
    filters?: ((contentType: ContentTypeSchema) => boolean)[];
    params?: { [uid: string]: unknown };
  };
}

interface IDeleteResults {
  count: number;
  aggregate: { [uid: string]: { count: number } };
}

export const deleteRecords = async (strapi: Strapi.Strapi, options?: IRestoreOptions) => {
  const entities = await deleteEntitiesRecord(strapi, options);
  const configuration = await deleteConfigurationRecords(strapi, options);

  return {
    count: entities.count + configuration.count,
    entities,
    configuration,
  };
};

const deleteEntitiesRecord = async (
  strapi: Strapi.Strapi,
  options: IRestoreOptions = {}
): Promise<IDeleteResults> => {
  const { entities } = options;
  const query = queries.entity.createEntityQuery(strapi);
  const contentTypes = Object.values<ContentTypeSchema>(strapi.contentTypes);

  const contentTypesToClear = contentTypes.filter((contentType) => {
    let keep = true;

    if (entities?.include) {
      keep = entities.include.includes(contentType.uid);
    }

    if (entities?.exclude) {
      keep = !entities.exclude.includes(contentType.uid);
    }

    if (entities?.filters) {
      keep = entities.filters.every((filter) => filter(contentType));
    }

    return keep;
  });

  const [results, updateResults] = useResults(
    contentTypesToClear.map((contentType) => contentType.uid)
  );

  const deletePromises = contentTypesToClear.map(async (contentType) => {
    const result = await query(contentType.uid).deleteMany(entities?.params);

    if (result) {
      updateResults(result.count || 0, contentType.uid);
    }
  });

  await Promise.all(deletePromises);

  return results;
};

const deleteConfigurationRecords = async (
  strapi: Strapi.Strapi,
  options: IRestoreOptions = {}
): Promise<IDeleteResults> => {
  const { coreStore = true, webhook = true } = options?.configuration ?? {};

  const models: string[] = [];

  if (coreStore) {
    models.push('strapi::core-store');
  }

  if (webhook) {
    models.push('webhook');
  }

  const [results, updateResults] = useResults(models);

  const deletePromises = models.map(async (uid) => {
    const result = await strapi.db.query(uid).deleteMany({});

    if (result) {
      updateResults(result.count, uid);
    }
  });

  await Promise.all(deletePromises);

  return results;
};

const useResults = (
  keys: string[]
): [IDeleteResults, (count: number, key?: string) => void | never] => {
  const results: IDeleteResults = {
    count: 0,
    aggregate: keys.reduce((acc, key) => ({ ...acc, [key]: { count: 0 } }), {}),
  };

  const update = (count: number, key?: string) => {
    if (key) {
      if (!(key in results.aggregate)) {
        throw new ProviderTransferError(`Unknown key "${key}" provided in results update`);
      }

      results.aggregate[key].count += count;
    }

    results.count += count;
  };

  return [results, update];
};

export * from './entities';
export * from './configuration';
export * from './links';
