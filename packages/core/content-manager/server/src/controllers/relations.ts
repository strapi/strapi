import { prop, uniq, flow } from 'lodash/fp';
import { isOperatorOfType, contentTypes } from '@strapi/utils';
import { type Common, type Entity, type Documents } from '@strapi/types';
import { errors } from '@strapi/utils';
import { getService } from '../utils';
import { validateFindAvailable, validateFindExisting } from './validation/relations';
import { isListable } from '../services/utils/configuration/attributes';

const { PUBLISHED_AT_ATTRIBUTE } = contentTypes.constants;

const addFiltersClause = (params: any, filtersClause: any) => {
  params.filters = params.filters || {};
  params.filters.$and = params.filters.$and || [];
  params.filters.$and.push(filtersClause);
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

const mapResults = (results: Array<any>) => {
  return results.map((result: any) => {
    if (result.documentId !== undefined) {
      result.id = result.documentId;
      delete result.documentId;
    }

    return result;
  });
};

export default {
  async extractAndValidateRequestInfo(
    ctx: any,
    id?: Entity.ID,
    status?: Documents.Params.PublicationState.Kind,
    locale?: Documents.Params.Locale
  ) {
    const { userAbility } = ctx.state;
    const { model, targetField } = ctx.params;

    const sourceSchema = strapi.getModel(model);
    if (!sourceSchema) {
      throw new errors.ValidationError(`The model ${model} doesn't exist`);
    }

    const attribute: any = sourceSchema.attributes[targetField];
    if (!attribute || attribute.type !== 'relation') {
      throw new errors.ValidationError(
        `The relational field ${targetField} doesn't exist on ${model}`
      );
    }

    const permissionChecker = getService('permission-checker').create({
      userAbility,
      model,
    });

    const isSourceComponent = sourceSchema.modelType === 'component';
    if (!isSourceComponent) {
      if (permissionChecker.cannot.read(null, targetField)) {
        return ctx.forbidden();
      }
    }

    const where: Record<string, any> = {};
    if (!isSourceComponent) {
      where.locale = locale;
      where.publishedAt = status === 'published' ? { $ne: null } : null;
    }

    let currentEntity = { id: null };
    if (id) {
      if (!isSourceComponent) {
        where.documentId = id;
      } else {
        where.id = id;
      }

      const permissionQuery = await permissionChecker.sanitizedQuery.read(ctx.query);
      // @ts-expect-error populate builder needs to be called with a UID
      const populate = await getService('populate-builder')(model)
        .populateFromQuery(permissionQuery)
        .build();

      currentEntity = await strapi.db.query(model).findOne({
        where,
        populate,
      });

      // If an Id is provided we are asking to find the relations (available or
      // existing) on an existing entity. We need to check if the entity exists
      // and if the user has the permission to read it in this way
      if (!currentEntity) {
        throw new errors.NotFoundError();
      }

      if (!isSourceComponent) {
        if (permissionChecker.cannot.read(currentEntity, targetField)) {
          throw new errors.ForbiddenError();
        }
      }
    }

    const modelConfig = isSourceComponent
      ? await getService('components').findConfiguration(sourceSchema)
      : await getService('content-types').findConfiguration(sourceSchema);

    const targetSchema = strapi.getModel(attribute.target);

    const mainField = flow(
      prop(`metadatas.${targetField}.edit.mainField`),
      (mainField) => mainField || 'id',
      (mainField) => sanitizeMainField(targetSchema, mainField, userAbility)
    )(modelConfig);

    const fieldsToSelect = uniq([mainField, PUBLISHED_AT_ATTRIBUTE, 'documentId']);
    if (locale) {
      fieldsToSelect.push('locale');
    }

    return {
      attribute,
      fieldsToSelect,
      mainField,
      sourceSchema,
      targetSchema,
      targetField,
      currentEntityId: currentEntity?.id,
    };
  },

  async findAvailable(ctx: any) {
    await validateFindAvailable(ctx.request.query);

    const { id } = ctx.request.query;
    const locale = ctx.request?.query?.locale || null;
    const status = ctx.request?.query?.status || 'draft';

    const validation = await this.extractAndValidateRequestInfo(ctx, id, status, locale);

    const {
      targetField,
      fieldsToSelect,
      mainField,
      sourceSchema: { uid: sourceUid },
      targetSchema: { uid: targetUid },
      currentEntityId,
    } = validation;

    const { idsToOmit, idsToInclude, _q, ...query } = ctx.request.query;

    const permissionChecker = getService('permission-checker').create({
      userAbility: ctx.state.userAbility,
      model: targetUid,
    });
    const permissionQuery = await permissionChecker.sanitizedQuery.read(query);

    const queryParams = {
      sort: mainField,
      // cannot select other fields as the user may not have the permissions
      fields: fieldsToSelect,
      ...permissionQuery,
    };

    const isPublished = status === 'published';
    // Only ever findAvailable (e.g. populate relation select) on a draft entry
    addFiltersClause(queryParams, {
      [PUBLISHED_AT_ATTRIBUTE]: isPublished ? { $ne: null } : null,
    });

    // We are looking for available content type relations and should be
    // filtering by valid documentIds only
    if (idsToOmit?.length > 0) {
      addFiltersClause(queryParams, {
        documentId: { $notIn: uniq(idsToOmit) },
      });
    }

    if (_q) {
      // searching should be allowed only on mainField for permission reasons
      const _filter = isOperatorOfType('where', query._filter) ? query._filter : '$containsi';
      addFiltersClause(queryParams, { [mainField]: { [_filter]: _q } });
    }

    if (currentEntityId) {
      // If we have been given an entity id, we need to filter out the
      // relations that are already linked to the current entity
      const subQuery = strapi.db.queryBuilder(sourceUid);

      // The alias refers to the DB table of the target model
      const alias = subQuery.getAlias();

      const where: Record<string, any> = {
        id: currentEntityId,
        [`${alias}.id`]: { $notNull: true },
        // Always find available draft entries, as we will be potentially
        // connecting them from the CM edit view
        [`${alias}.published_at`]: { $notNull: isPublished },
      };

      if ((idsToInclude?.length ?? 0) !== 0) {
        where[`${alias}.document_id`].$notIn = idsToInclude;
      }

      const knexSubQuery = subQuery
        .where(where)
        .join({ alias, targetField })
        .select(`${alias}.id`)
        .getKnexQuery();

      addFiltersClause(queryParams, { id: { $notIn: knexSubQuery } });
    }

    // We find a page of the targeted model (relation) to display in the
    // relation select component in the CM edit view
    const res = await strapi.entityService.findPage(
      targetUid as Common.UID.ContentType,
      queryParams
    );

    ctx.body = {
      ...res,
      results: Array.isArray(res.results) ? mapResults(res.results) : [],
    };
  },

  async findExisting(ctx: any) {
    await validateFindExisting(ctx.request.query);
    const { id } = ctx.params;
    const locale = ctx.request?.query?.locale || null;
    const status = ctx.request?.query?.status || 'draft';

    const validation = await this.extractAndValidateRequestInfo(ctx, id, status, locale);

    const {
      targetField,
      fieldsToSelect,
      sourceSchema: { uid: sourceUid },
      targetSchema: { uid: targetUid },
      currentEntityId,
    } = validation;

    const entity = await strapi.db.query(sourceUid).findOne({
      where: { id: currentEntityId },
      select: ['id'],
      populate: { [targetField]: { fields: ['id'] } },
    });

    // Collect all the entity IDs relations in the targetField
    let resultEntityIds = [];
    if (entity?.[targetField]) {
      if (Array.isArray(entity?.[targetField])) {
        resultEntityIds = entity?.[targetField]?.map((result: any) => result.id);
      } else {
        resultEntityIds = entity?.[targetField]?.id ? [entity[targetField].id] : [];
      }
    }

    const fields: Array<string> = locale ? [...fieldsToSelect, 'locale'] : fieldsToSelect;
    const sort = fields
      .filter((field: any) => !['id', 'locale', 'publishedAt'].includes(field))
      .map((field: any) => field);

    const page = await strapi.db.query(targetUid).findPage({
      select: fields,
      filters: {
        // The existing relations will be entries of the target model who's
        // entity ID is in the list of entity IDs related to the source entity
        id: { $in: resultEntityIds },
      },
      orderBy: sort,
      page: ctx.request.query.page,
      pageSize: ctx.request.query.pageSize,
    });

    ctx.body = {
      ...page,
      results: Array.isArray(page.results) ? mapResults(page.results) : [],
    };
  },
};
