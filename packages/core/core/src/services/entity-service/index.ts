import _ from 'lodash';
import delegate from 'delegates';
import { errors as databaseErrors } from '@strapi/database';
import {
  contentTypes as contentTypesUtils,
  errors,
  relations as relationUtils,
} from '@strapi/utils';
import type { Database } from '@strapi/database';
import type { Core, Modules, Utils } from '@strapi/types';

type Decoratable<T> = T & {
  decorate(
    decorator: (old: Modules.EntityService.EntityService) => Modules.EntityService.EntityService & {
      [key: string]: unknown;
    }
  ): void;
};

const transformLoadParamsToQuery = (
  uid: string,
  field: string,
  params: Record<string, unknown>,
  pagination = {}
) => {
  const query = strapi
    .get('query-params')
    .transform(uid, { populate: { [field]: params } as any }) as any;

  const res = {
    ...query.populate[field],
    ...pagination,
  };

  return res;
};

const databaseErrorsToTransform = [
  databaseErrors.InvalidTimeError,
  databaseErrors.InvalidDateTimeError,
  databaseErrors.InvalidDateError,
  databaseErrors.InvalidRelationError,
];

const createDefaultImplementation = ({
  strapi,
  db,
}: {
  strapi: Core.Strapi;
  db: Database;
}): Modules.EntityService.EntityService => ({
  async wrapParams(options: any = {}) {
    return options;
  },

  async wrapResult(result: any = {}) {
    return result;
  },

  async findMany(uid, opts) {
    const { kind } = strapi.getModel(uid);

    const wrappedParams = await this.wrapParams(opts, { uid, action: 'findMany' });

    if (kind === 'singleType') {
      const entity = strapi.documents!(uid).findFirst(wrappedParams);
      return this.wrapResult(entity, { uid, action: 'findOne' });
    }

    const entities = await strapi.documents!(uid).findMany(wrappedParams);
    return this.wrapResult(entities, { uid, action: 'findMany' });
  },

  async findPage(uid, opts) {
    const wrappedParams = await this.wrapParams(opts, { uid, action: 'findPage' });

    const query = strapi.get('query-params').transform(uid, wrappedParams);

    const entities = await db.query(uid).findPage(query);
    return this.wrapResult(entities, { uid, action: 'findMany' });
  },

  async findOne(uid, entityId, opts) {
    const wrappedParams = await this.wrapParams(opts, { uid, action: 'findOne' });

    const res = await db.query(uid).findOne({ where: { id: entityId } });

    if (!res) {
      return this.wrapResult(null, { uid, action: 'findOne' });
    }

    const entity = await strapi.documents!(uid).findOne({
      ...wrappedParams,
      documentId: res.documentId,
    });
    return this.wrapResult(entity, { uid, action: 'findOne' });
  },

  async count(uid, opts) {
    const wrappedParams = await this.wrapParams(opts, { uid, action: 'count' });

    return strapi.documents!(uid).count(wrappedParams);
  },

  async create(uid, params) {
    const wrappedParams = await this.wrapParams<
      Modules.EntityService.Params.Pick<typeof uid, 'data' | 'fields' | 'populate'>
    >(params, { uid, action: 'create' });
    const { data } = wrappedParams;

    if (!data) {
      throw new Error('cannot create');
    }

    const shouldPublish = !contentTypesUtils.isDraft(data, strapi.getModel(uid));

    const entity = await strapi.documents!(uid).create({
      ...(wrappedParams as any),
      status: shouldPublish ? 'published' : 'draft',
    });

    return this.wrapResult(entity, { uid, action: 'create' });
  },

  async update(uid, entityId, opts) {
    const wrappedParams = await this.wrapParams<
      Modules.EntityService.Params.Pick<typeof uid, 'data:partial' | 'fields' | 'populate'>
    >(opts, {
      uid,
      action: 'update',
    });
    const entityToUpdate = await db.query(uid).findOne({ where: { id: entityId } });

    if (!entityToUpdate) {
      return this.wrapResult(null, { uid, action: 'update' });
    }

    const shouldPublish = !contentTypesUtils.isDraft(entityToUpdate, strapi.getModel(uid));

    const entity = strapi.documents!(uid).update({
      ...(wrappedParams as any),
      status: shouldPublish ? 'published' : 'draft',
      documentId: entityToUpdate.documentId,
    });

    return this.wrapResult(entity, { uid, action: 'update' });
  },

  async delete(uid, entityId, opts) {
    const wrappedParams = await this.wrapParams(opts, { uid, action: 'delete' });

    const entityToDelete = await db.query(uid).findOne({ where: { id: entityId } });

    if (!entityToDelete) {
      return this.wrapResult(null, { uid, action: 'delete' });
    }

    await strapi.documents!(uid).delete({
      ...wrappedParams,
      documentId: entityToDelete.documentId,
    });

    return this.wrapResult(entityToDelete, { uid, action: 'delete' });
  },

  async load(uid, entity, field, params) {
    if (!_.isString(field)) {
      throw new Error(`Invalid load. Expected "${field}" to be a string`);
    }

    const loadedEntity = await db
      .query(uid)
      .load(entity, field, transformLoadParamsToQuery(uid, field, params ?? {}));

    return this.wrapResult(loadedEntity, { uid, field, action: 'load' });
  },

  async loadPages(uid, entity, field, params, pagination = {}) {
    if (!_.isString(field)) {
      throw new Error(`Invalid load. Expected "${field}" to be a string`);
    }

    const { attributes } = strapi.getModel(uid);
    const attribute = attributes[field];

    if (!relationUtils.isAnyToMany(attribute)) {
      throw new Error(`Invalid load. Expected "${field}" to be an anyToMany relational attribute`);
    }

    const query = transformLoadParamsToQuery(uid, field, params ?? {}, pagination);

    const loadedPage = await db.query(uid).loadPages(entity, field, query);

    return {
      ...loadedPage,
      results: await this.wrapResult(loadedPage.results, { uid, field, action: 'load' }),
    };
  },
});

export default (ctx: {
  strapi: Core.Strapi;
  db: Database;
}): Decoratable<Modules.EntityService.EntityService> => {
  const implementation = createDefaultImplementation(ctx);

  const service = {
    implementation,
    decorate<T extends object>(decorator: (current: typeof implementation) => T) {
      if (typeof decorator !== 'function') {
        throw new Error(`Decorator must be a function, received ${typeof decorator}`);
      }

      this.implementation = { ...this.implementation, ...decorator(this.implementation) };
      return this;
    },
  };

  const delegator = delegate(service, 'implementation');

  // delegate every method in implementation
  Object.keys(service.implementation).forEach((key) => delegator.method(key));

  // wrap methods to handle Database Errors
  service.decorate((oldService: Modules.EntityService.EntityService) => {
    const newService = _.mapValues(
      oldService,
      (method, methodName: keyof Modules.EntityService.EntityService) =>
        async function (this: Modules.EntityService.EntityService, ...args: []) {
          try {
            return await (oldService[methodName] as Utils.Function.AnyPromise).call(this, ...args);
          } catch (error) {
            if (
              databaseErrorsToTransform.some(
                (errorToTransform) => error instanceof errorToTransform
              )
            ) {
              if (error instanceof Error) {
                throw new errors.ValidationError(error.message);
              }

              throw error;
            }
            throw error;
          }
        }
    );

    return newService;
  });

  return service as unknown as Decoratable<Modules.EntityService.EntityService>;
};
