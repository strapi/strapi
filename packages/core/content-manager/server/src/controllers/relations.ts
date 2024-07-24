import { prop, isEmpty, uniq, flow, uniqBy, concat } from 'lodash/fp';
import { isOperatorOfType, contentTypes, relations } from '@strapi/utils';
import { getService } from '../utils';
import { validateFindAvailable, validateFindExisting } from './validation/relations';
import { isListable } from '../services/utils/configuration/attributes';

const { hasDraftAndPublish } = contentTypes;
const { PUBLISHED_AT_ATTRIBUTE } = contentTypes.constants;
const { isAnyToMany } = relations;

const addFiltersClause = (params: any, filtersClause: any) => {
  params.filters = params.filters || {};
  if (params.filters.$and) {
    params.filters.$and.push(filtersClause);
  } else {
    params.filters.$and = [filtersClause];
  }
};

const sanitizeMainField = (model: any, mainField: any, userAbility: any) => {
  const permissionChecker = getService('permission-checker').create({
    userAbility,
    model: model.uid,
  });

  if (!isListable(model, mainField)) {
    return 'id';
  }

  if (permissionChecker.cannot.read(null, mainField)) {
    // Allow reading role name if user can read the user model
    if (model.uid === 'plugin::users-permissions.role') {
      const userPermissionChecker = getService('permission-checker').create({
        userAbility,
        model: 'plugin::users-permissions.user',
      });

      if (userPermissionChecker.can.read()) {
        return 'name';
      }
    }

    return 'id';
  }

  return mainField;
};

export default {
  async findAvailable(ctx: any) {
    const { userAbility } = ctx.state;
    const { model, targetField } = ctx.params;

    await validateFindAvailable(ctx.request.query);

    // idsToOmit: used to exclude relations that the front already added but that were not saved yet
    // idsToInclude: used to include relations that the front removed but not saved yes
    const { entityId, idsToOmit, idsToInclude, _q, ...query } = ctx.request.query;

    const modelSchema = strapi.getModel(model);
    if (!modelSchema) {
      return ctx.badRequest("The model doesn't exist");
    }

    const attribute: any = modelSchema.attributes[targetField];
    if (!attribute || attribute.type !== 'relation') {
      return ctx.badRequest("This relational field doesn't exist");
    }

    const isComponent = modelSchema.modelType === 'component';

    if (!isComponent) {
      const permissionChecker = getService('permission-checker').create({
        userAbility,
        model,
      });

      if (permissionChecker.cannot.read(null, targetField)) {
        return ctx.forbidden();
      }

      if (entityId) {
        const entityManager = getService('entity-manager');

        const permissionQuery = await permissionChecker.sanitizedQuery.read(ctx.query);
        // @ts-expect-error populate builder needs to be called with a UID
        const populate = await getService('populate-builder')(model)
          .populateFromQuery(permissionQuery)
          .build();

        const entity = await entityManager.findOne(entityId, model, { populate });

        if (!entity) {
          return ctx.notFound();
        }

        if (permissionChecker.cannot.read(entity, targetField)) {
          return ctx.forbidden();
        }
      }
    } else {
      // eslint-disable-next-line no-lonely-if
      if (entityId) {
        const entity = await strapi.entityService.findOne(model, entityId);

        if (!entity) {
          return ctx.notFound();
        }
      }
    }

    const targetedModel: any = strapi.getModel(attribute.target);

    const modelConfig = isComponent
      ? await getService('components').findConfiguration(modelSchema)
      : await getService('content-types').findConfiguration(modelSchema);

    const mainField = flow(
      prop(`metadatas.${targetField}.edit.mainField`),
      (mainField) => mainField || 'id',
      (mainField) => sanitizeMainField(targetedModel, mainField, userAbility)
    )(modelConfig);

    const fieldsToSelect = uniq(['id', mainField]);
    if (hasDraftAndPublish(targetedModel)) {
      fieldsToSelect.push(PUBLISHED_AT_ATTRIBUTE);
    }

    const permissionChecker = getService('permission-checker').create({
      userAbility,
      model: targetedModel.uid,
    });
    const permissionQuery = await permissionChecker.sanitizedQuery.read(query);

    const queryParams = {
      sort: mainField,
      fields: fieldsToSelect, // cannot select other fields as the user may not have the permissions
      ...permissionQuery,
    };

    if (!isEmpty(idsToOmit)) {
      addFiltersClause(queryParams, { id: { $notIn: idsToOmit } });
    }

    // searching should be allowed only on mainField for permission reasons
    if (_q) {
      const _filter = isOperatorOfType('where', query._filter) ? query._filter : '$containsi';
      addFiltersClause(queryParams, { [mainField]: { [_filter]: _q } });
    }

    if (entityId) {
      const subQuery = strapi.db.queryBuilder(modelSchema.uid);

      const alias = subQuery.getAlias();

      const where = {
        id: entityId,
        [`${alias}.id`]: { $notNull: true },
      };

      if (!isEmpty(idsToInclude)) {
        where[`${alias}.id`].$notIn = idsToInclude;
      }

      const knexSubQuery = subQuery
        .where(where)
        .join({ alias, targetField })
        .select(`${alias}.id`)
        .getKnexQuery();

      addFiltersClause(queryParams, { id: { $notIn: knexSubQuery } });
    }

    ctx.body = await strapi.entityService.findPage(targetedModel.uid, queryParams);
  },

  async findExisting(ctx: any) {
    const { userAbility } = ctx.state;
    const { model, id, targetField } = ctx.params;

    await validateFindExisting(ctx.request.query);

    const modelSchema = strapi.getModel(model);
    if (!modelSchema) {
      return ctx.badRequest("The model doesn't exist");
    }

    const attribute: any = modelSchema.attributes[targetField];
    if (!attribute || attribute.type !== 'relation') {
      return ctx.badRequest("This relational field doesn't exist");
    }

    const isComponent = modelSchema.modelType === 'component';

    if (!isComponent) {
      const entityManager = getService('entity-manager');
      const permissionChecker = getService('permission-checker').create({
        userAbility,
        model,
      });

      if (permissionChecker.cannot.read(null, targetField)) {
        return ctx.forbidden();
      }

      const permissionQuery = await permissionChecker.sanitizedQuery.read(ctx.query);
      // @ts-expect-error populate builder needs to be called with a UID
      const populate = await getService('populate-builder')(model)
        .populateFromQuery(permissionQuery)
        .build();

      const entity = await entityManager.findOne(id, model, { populate });

      if (!entity) {
        return ctx.notFound();
      }

      if (permissionChecker.cannot.read(entity, targetField)) {
        return ctx.forbidden();
      }
    } else {
      const entity = await strapi.entityService.findOne(model, id);

      if (!entity) {
        return ctx.notFound();
      }
    }

    const targetedModel = strapi.getModel(attribute.target);

    const modelConfig = isComponent
      ? await getService('components').findConfiguration(modelSchema)
      : await getService('content-types').findConfiguration(modelSchema);

    const mainField = flow(
      prop(`metadatas.${targetField}.edit.mainField`),
      (mainField) => mainField || 'id',
      (mainField) => sanitizeMainField(targetedModel, mainField, userAbility)
    )(modelConfig);

    const fieldsToSelect = uniq(['id', mainField]);
    if (hasDraftAndPublish(targetedModel)) {
      fieldsToSelect.push(PUBLISHED_AT_ATTRIBUTE);
    }

    const queryParams = {
      fields: fieldsToSelect,
    };

    const permissionChecker = getService('permission-checker').create({
      userAbility,
      model: targetedModel.uid,
    });
    const permissionQuery = await permissionChecker.sanitizedQuery.read(queryParams);

    if (isAnyToMany(attribute)) {
      const res = await strapi.entityService.loadPages(
        model,
        { id },
        targetField,
        {
          fields: ['id'],
          ordering: 'desc',
        } as any,
        {
          page: ctx.request.query.page,
          pageSize: ctx.request.query.pageSize,
        }
      );
      const ids = res.results.map((item: any) => item.id);

      addFiltersClause(permissionQuery, { id: { $in: ids } });

      const sanitizedRes = await strapi.entityService.loadPages(
        model,
        { id },
        targetField,
        {
          ...permissionQuery,
          ordering: 'desc',
        } as any,
        {
          page: 1,
          pageSize: ids.length,
        }
      );

      res.results = uniqBy('id', concat(sanitizedRes.results, res.results));

      ctx.body = res;
    } else {
      const [resWithOnlyId, res] = await Promise.all([
        strapi.entityService.load(model, { id }, targetField, {
          fields: ['id'],
        }),
        strapi.entityService.load(model, { id }, targetField, {
          ...permissionQuery,
        }),
      ]);
      const result = res || resWithOnlyId;
      ctx.body = {
        data: result,
      };
    }
  },
};
