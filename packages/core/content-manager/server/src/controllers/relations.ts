import { prop, uniq, flow, sortBy } from 'lodash/fp';
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
  async extractAndValidateRequestInfo(ctx: any, documentId: string) {
    const { userAbility } = ctx.state;
    const { model, targetField } = ctx.params;

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

      if (documentId) {
        const entityManager = getService('entity-manager');

        const permissionQuery = await permissionChecker.sanitizedQuery.read(ctx.query);
        // @ts-expect-error populate builder needs to be called with a UID
        const populate = await getService('populate-builder')(model)
          .populateFromQuery(permissionQuery)
          .build();

        const entity = await entityManager.findOne(documentId, model, { populate });

        if (!entity) {
          return ctx.notFound();
        }

        if (permissionChecker.cannot.read(entity, targetField)) {
          return ctx.forbidden();
        }
      }
    } else if (documentId) {
      // TODO: components
      const entity = await strapi.entityService.findOne(model, documentId);

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

    const fieldsToSelect = uniq(['id', mainField, PUBLISHED_AT_ATTRIBUTE]);

    return {
      attribute,
      fieldsToSelect,
      targetedModel,
      mainField,
      modelSchema,
      targetField,
    };
  },

  async findAvailable(ctx: any) {
    await validateFindAvailable(ctx.request.query);

    const { id } = ctx.request.query;

    const validation = await this.extractAndValidateRequestInfo(ctx, id);
    if (!validation) {
      // If validation of the request has failed the error has already been sent
      // to the ctx
      return;
    }

    const {
      targetField,
      targetedModel,
      fieldsToSelect,
      mainField,
      modelSchema: { uid },
    } = validation;
    const { idsToOmit, idsToInclude, _q, ...query } = ctx.request.query;

    const permissionChecker = getService('permission-checker').create({
      userAbility: ctx.state.userAbility,
      model: targetedModel.uid,
    });
    const permissionQuery = await permissionChecker.sanitizedQuery.read(query);

    const locale = ctx.request?.query?.locale || null;
    const status = ctx.request?.query.status;

    const queryParams = {
      sort: mainField,
      // cannot select other fields as the user may not have the permissions
      fields: locale ? [...fieldsToSelect, 'locale'] : fieldsToSelect,
      ...permissionQuery,
    };

    let currentRelationIds: string[] = [];
    if (id) {
      // If we have been given an id, first find all the relations that are already linked to the entity
      const currentEntity = await getService('entity-manager').findOne(id, uid, {
        fields: ['id'],
        locale,
        status,
        populate: { [targetField]: { fields: ['id'] } },
      });

      let currentRelations = currentEntity?.[targetField];
      if (!currentRelations) {
        currentRelations = [];
      } else if (!Array.isArray(currentRelations)) {
        currentRelations = [currentRelations];
      }

      currentRelationIds = currentRelations.map((relation: any) => relation.id) ?? [];
    }

    // Exlude the ids we are omitting and those that are already linked to the entity
    addFiltersClause(queryParams, {
      id: { $notIn: uniq([...(idsToOmit ?? []), ...currentRelationIds]) },
    });

    if (_q) {
      // searching should be allowed only on mainField for permission reasons
      const _filter = isOperatorOfType('where', query._filter) ? query._filter : '$containsi';
      addFiltersClause(queryParams, { [mainField]: { [_filter]: _q } });
    }

    const availableRelations = await getService('entity-manager').findPage(
      queryParams,
      targetedModel.uid
    );

    ctx.body = availableRelations;
  },

  async findExisting(ctx: any) {
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
