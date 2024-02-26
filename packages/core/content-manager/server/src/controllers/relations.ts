import { prop, uniq, flow } from 'lodash/fp';
import { isOperatorOfType, contentTypes } from '@strapi/utils';
import { type Common } from '@strapi/types';
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

const isNumeric = (value: any): value is number => {
  const parsed = parseInt(value, 10);
  return !Number.isNaN(parsed);
};

/**
 *
 */
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
    status?: 'draft' | 'published',
    id?: string | number,
    locale?: string
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

    const isSourceComponent = sourceSchema.modelType === 'component';

    const where: Record<string, any> = {};
    if (!isSourceComponent) {
      where.locale = locale;
      where.publishedAt = status === 'published' ? { $ne: null } : null;
    }

    let currentEntity = { id: null };
    if (id) {
      // The Id we receive can be a documentId or a numerical entity id
      if (isNumeric(id)) {
        // TODO is there a better way to distinguish between the two?
        where.id = id;
      } else {
        where.documentId = id;
      }

      currentEntity = await strapi.db.query(model).findOne({
        where,
        select: ['id'],
      });

      // If an Id is provided we are asking to find the relations (available or
      // existing) on an existing entity. We need to check if the entity exists
      // and if the user has the permission to read it in this way

      if (!currentEntity) {
        throw new errors.NotFoundError();
      }

      if (!isSourceComponent) {
        const permissionChecker = getService('permission-checker').create({
          userAbility,
          model,
        });

        if (permissionChecker.cannot.read(null, targetField)) {
          throw new errors.ForbiddenError();
        }

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

    const validation = await this.extractAndValidateRequestInfo(ctx, status, id, locale);
    if (!validation) {
      // If validation of the request has failed the error has already been sent
      // to the ctx
      return;
    }

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

    // Only ever findAvailable (e.g. populate relation select) on a draft entry
    addFiltersClause(queryParams, {
      [PUBLISHED_AT_ATTRIBUTE]: null,
    });

    // We are looking for available content type relations and should be
    // filtering by valid documentIds only
    const stringIdsToOmit = idsToOmit?.filter((id: any) => !Number(id));
    if (stringIdsToOmit?.length > 0) {
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
        [`${alias}.published_at`]: { $notNull: false },
      };

      const stringIdsToInclude = idsToInclude?.filter((id: any) => !Number(id));
      if ((stringIdsToInclude?.length ?? 0) !== 0) {
        where[`${alias}.document_id`].$notIn = stringIdsToInclude;
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

    const validation = await this.extractAndValidateRequestInfo(ctx, status, id, locale);
    if (!validation) {
      // If validation of the request has failed the error has already been sent
      // to the ctx
      return;
    }

    const {
      targetField,
      fieldsToSelect,
      sourceSchema: { uid: sourceUid },
      targetSchema: { uid: targetUid },
      currentEntityId,
    } = validation;

    const entity = await strapi.entityService.findOne(
      sourceUid as Common.UID.ContentType,
      // TODO
      currentEntityId as unknown as number,
      {
        fields: ['id'],
        populate: { [targetField]: { fields: ['id'] } },
      }
    );

    let resultIds = [];

    if (entity?.[targetField]) {
      if (Array.isArray(entity?.[targetField])) {
        resultIds = entity?.[targetField]?.map((result: any) => result.id);
      } else {
        resultIds = [entity?.[targetField]?.id] ?? [];
      }
    }

    const fields: Array<string> = locale ? [...fieldsToSelect, 'locale'] : fieldsToSelect;
    const sort = fields
      .filter((field: any) => !['id', 'locale', 'publishedAt'].includes(field))
      .map((field: any) => `${field}:ASC`);

    const page = await strapi.entityService.findPage(targetUid as Common.UID.ContentType, {
      fields,
      filters: {
        id: { $in: resultIds },
      },
      sort,
      page: ctx.request.query.page,
      pageSize: ctx.request.query.pageSize,
    });

    ctx.body = {
      ...page,
      results: Array.isArray(page.results) ? mapResults(page.results) : [],
    };
  },
};
