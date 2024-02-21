import { prop, uniq, flow, sortBy, omit } from 'lodash/fp';
import { isOperatorOfType, contentTypes, relations } from '@strapi/utils';
import { getService } from '../utils';
import { validateFindAvailable, validateFindExisting } from './validation/relations';
import { isListable } from '../services/utils/configuration/attributes';

const { PUBLISHED_AT_ATTRIBUTE } = contentTypes.constants;
const { isOneToAny } = relations;

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
  async extractAndValidateRequestInfo(
    ctx: any,
    status: string,
    id?: string | number,
    locale?: string
  ) {
    const { userAbility } = ctx.state;
    const { model, targetField } = ctx.params;

    const sourceSchema = strapi.getModel(model);
    if (!sourceSchema) {
      return ctx.badRequest(`The model ${model} doesn't exist`);
    }

    const attribute: any = sourceSchema.attributes[targetField];
    if (!attribute || attribute.type !== 'relation') {
      return ctx.badRequest(`The relational field ${targetField} doesn't exist on ${model}`);
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
      // TODO is there a better way to distinguish between the two?
      if (Number.isNaN(Number(id))) {
        where.documentId = id;
      } else {
        where.id = Number(id);
      }

      currentEntity = await strapi.db.query(model).findOne({
        where,
        select: ['id'],
      });

      // If an Id is provided we are asking to find the relations (available or
      // existing) on an existing entity. We need to check if the entity exists
      // and if the user has the permission to read it in this way

      if (!currentEntity) {
        return ctx.notFound();
      }

      if (!isSourceComponent) {
        const permissionChecker = getService('permission-checker').create({
          userAbility,
          model,
        });

        if (permissionChecker.cannot.read(null, targetField)) {
          return ctx.forbidden();
        }

        if (permissionChecker.cannot.read(currentEntity, targetField)) {
          return ctx.forbidden();
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

    return {
      attribute,
      fieldsToSelect,
      mainField,
      sourceUid: sourceSchema.uid,
      targetUid: targetSchema.uid,
      targetField,
      currentEntityId: currentEntity?.id,
    };
  },

  async findAvailable(ctx: any) {
    await validateFindAvailable(ctx.request.query);

    const { id } = ctx.request.query;
    const locale = ctx.request?.query?.locale || null;
    const status = ctx.request?.query.status;

    const validation = await this.extractAndValidateRequestInfo(ctx, status, id, locale);
    if (!validation) {
      // If validation of the request has failed the error has already been sent
      // to the ctx
      return;
    }

    const { targetField, fieldsToSelect, mainField, sourceUid, targetUid, currentEntityId } =
      validation;

    const { idsToOmit, idsToInclude, _q, ...query } = ctx.request.query;

    const permissionChecker = getService('permission-checker').create({
      userAbility: ctx.state.userAbility,
      model: targetUid,
    });
    const permissionQuery = await permissionChecker.sanitizedQuery.read(query);

    const queryParams = {
      sort: mainField,
      // cannot select other fields as the user may not have the permissions
      fields: locale ? [...fieldsToSelect, 'locale'] : fieldsToSelect,
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
    const res = await strapi.entityService.findPage(targetUid, queryParams);

    ctx.body = {
      ...res,
      results: res.results.map((result: any) => {
        if (result.documentId === undefined) {
          return result;
        }

        return { ...omit(['documentId'], result), id: result.documentId };
      }),
    };
  },

  async findExisting(ctx: any) {
    // TODO
    return;
    await validateFindExisting(ctx.request.query);
    const { id } = ctx.params;

    const validation = await this.extractAndValidateRequestInfo(ctx, id);
    if (!validation) {
      // If validation of the request has failed the error has already been sent
      // to the ctx
      return;
    }

    const locale = ctx.request?.query?.locale || null;
    const status = ctx.request?.query.status;

    let { fieldsToSelect } = validation;
    fieldsToSelect = locale ? [...fieldsToSelect, 'locale'] : fieldsToSelect;

    const { model } = ctx.params;
    const { targetField, targetedModel, attribute } = validation;
    // TODO sorting on mainField?
    // const { mainField } = validation;

    let modelUid: string = '';
    let filters;
    let sort = null;
    let populate = null;
    if (!isOneToAny(attribute)) {
      // If it is a many to any relation, we query for the target content type
      // Filtering for those related to the current entity

      modelUid = targetedModel.uid;
      filters = {
        [attribute?.mappedBy ?? attribute?.inversedBy]: {
          $and: [
            { id },
            { locale },
            { publishedAt: status === 'published' ? { $ne: null } : null },
          ],
        },
      };
      sort = fieldsToSelect
        .filter((field: any) => !['id', 'locale', 'publishedAt'].includes(field))
        .map((field: any) => `${field}:ASC`);
    } else {
      // If it is a one to any relation, we query for the source content type
      // filtering to the documentId, locale and status and populate the
      // selected fields from the target relation

      modelUid = model;
      filters = { id };
      populate = { [targetField]: { fields: fieldsToSelect } };
    }

    const queryParams = {
      fields: fieldsToSelect,
      locale,
      status,
      filters,
      sort,
      populate,
      page: ctx.request.query.page,
      pageSize: ctx.request.query.pageSize,
    };

    const page = await getService('entity-manager').findPage(queryParams, modelUid);

    // TODO simplify isOneToAny conditions
    if (isOneToAny(attribute) && page.results.length === 1) {
      let targetResult = page.results[0][targetField];
      if (!targetResult) {
        targetResult = [];
      } else if (!Array.isArray(targetResult)) {
        targetResult = [targetResult];
      }

      const getSortedResults = flow(
        sortBy(
          (value: any) => `${fieldsToSelect.map((field: any) => value?.[field] ?? null).join('-')}`
        )
      );

      const uniqueResults = getSortedResults(targetResult);
      ctx.body = { ...page, results: uniqueResults };
    } else {
      ctx.body = page;
    }
  },
};
