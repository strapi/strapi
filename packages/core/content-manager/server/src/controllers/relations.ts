import { prop, uniq, uniqBy, concat, flow, isEmpty } from 'lodash/fp';

import { isOperatorOfType, contentTypes, relations, errors } from '@strapi/utils';
import type { Data, Modules, UID } from '@strapi/types';

import { getService } from '../utils';
import { validateFindAvailable, validateFindExisting } from './validation/relations';
import { isListable } from '../services/utils/configuration/attributes';

const { PUBLISHED_AT_ATTRIBUTE, UPDATED_AT_ATTRIBUTE } = contentTypes.constants;

interface RelationEntity {
  id: Data.ID;
  documentId: Modules.Documents.ID;
  updatedAt: string | Date;
  publishedAt?: string | Date;
  [key: string]: unknown;
}

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

  // Whether the main field can be displayed or not, regardless of permissions.
  const isMainFieldListable = isListable(model, mainField);
  // Whether the user has the permission to access the model's main field (using RBAC abilities)
  const canReadMainField = permissionChecker.can.read(null, mainField);

  if (!isMainFieldListable || !canReadMainField) {
    // Default to 'id' if the actual main field shouldn't be displayed
    return 'id';
  }

  // Edge cases

  // 1. Enforce 'name' as the main field for users and permissions' roles
  if (model.uid === 'plugin::users-permissions.role') {
    return 'name';
  }

  return mainField;
};

/**
 *
 * All relations sent to this function should have the same status or no status
 */
const addStatusToRelations = async (targetUid: UID.Schema, relations: RelationEntity[]) => {
  if (!contentTypes.hasDraftAndPublish(strapi.getModel(targetUid))) {
    return relations;
  }

  const documentMetadata = getService('document-metadata');

  if (!relations.length) {
    return relations;
  }

  const firstRelation = relations[0];

  const filters: any = {
    documentId: { $in: relations.map((r) => r.documentId) },
    // NOTE: find the "opposite" status
    publishedAt: firstRelation.publishedAt !== null ? { $null: true } : { $notNull: true },
  };

  const availableStatus = await strapi.query(targetUid).findMany({
    select: ['id', 'documentId', 'locale', 'updatedAt', 'createdAt', 'publishedAt'],
    filters,
  });

  return relations.map((relation: RelationEntity) => {
    const availableStatuses = availableStatus.filter(
      (availableDocument: RelationEntity) =>
        availableDocument.documentId === relation.documentId &&
        (relation.locale ? availableDocument.locale === relation.locale : true)
    );

    return {
      ...relation,
      status: documentMetadata.getStatus(relation, availableStatuses),
    };
  });
};

const getPublishedAtClause = (status: string, uid: UID.Schema) => {
  const model = strapi.getModel(uid);

  /**
   * If dp is disabled, ignore the filter
   */
  if (!model || !contentTypes.hasDraftAndPublish(model)) {
    return {};
  }

  // Prioritize the draft status in case it's not provided
  return status === 'published' ? { $notNull: true } : { $null: true };
};

const validateLocale = (sourceUid: UID.Schema, targetUid: UID.ContentType, locale?: string) => {
  const sourceModel = strapi.getModel(sourceUid);
  const targetModel = strapi.getModel(targetUid);

  const isLocalized = strapi.plugin('i18n').service('content-types').isLocalizedContentType;
  const isSourceLocalized = isLocalized(sourceModel);
  const isTargetLocalized = isLocalized(targetModel);

  return {
    locale,
    isSourceLocalized,
    isTargetLocalized,
  };
};

const validateStatus = (
  sourceUid: UID.Schema,
  status?: Modules.Documents.Params.PublicationStatus.Kind
) => {
  const sourceModel = strapi.getModel(sourceUid);

  const isDP = contentTypes.hasDraftAndPublish;
  const isSourceDP = isDP(sourceModel);

  // Default to draft if not set
  if (!isSourceDP) return { status: undefined };

  switch (status) {
    case 'published':
      return { status: 'published' };
    default:
      // Assign to draft if the status is not valid
      return { status: 'draft' };
  }
};

export default {
  async extractAndValidateRequestInfo(ctx: any, id?: Data.ID) {
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

    const sourceUid = model;
    const targetUid = attribute.target;

    const { locale, isSourceLocalized, isTargetLocalized } = validateLocale(
      sourceUid,
      targetUid,
      ctx.request?.query?.locale
    );
    const { status } = validateStatus(sourceUid, ctx.request?.query?.status);

    const permissionChecker = getService('permission-checker').create({
      userAbility,
      model,
    });

    const isComponent = sourceSchema.modelType === 'component';
    if (!isComponent) {
      if (permissionChecker.cannot.read(null, targetField)) {
        return ctx.forbidden();
      }
    }

    let entryId: string | number | null = null;

    if (id) {
      const where: Record<string, any> = {};

      if (!isComponent) {
        where.documentId = id;

        if (status) {
          where.publishedAt = getPublishedAtClause(status, sourceUid);
        }

        if (locale && isSourceLocalized) {
          where.locale = locale;
        }
      } else {
        // If the source is a component, we only need to filter by the
        // component's entity id
        where.id = id;
      }

      const permissionQuery = await permissionChecker.sanitizedQuery.read(ctx.query);
      const populate = await getService('populate-builder')(model)
        .populateFromQuery(permissionQuery)
        .build();

      const currentEntity = await strapi.db.query(model).findOne({
        where,
        populate,
      });

      // We need to check if the entity exists
      // and if the user has the permission to read it in this way
      // There may be multiple entities (publication states) under this
      // documentId + locale. We only need to check if one exists
      if (!currentEntity) {
        throw new errors.NotFoundError();
      }

      if (!isComponent) {
        if (permissionChecker.cannot.read(currentEntity, targetField)) {
          throw new errors.ForbiddenError();
        }
      }

      entryId = currentEntity.id;
    }

    const modelConfig = isComponent
      ? await getService('components').findConfiguration(sourceSchema)
      : await getService('content-types').findConfiguration(sourceSchema);

    const targetSchema = strapi.getModel(targetUid);

    const mainField = flow(
      prop(`metadatas.${targetField}.edit.mainField`),
      (mainField) => mainField || 'id',
      (mainField) => sanitizeMainField(targetSchema, mainField, userAbility)
    )(modelConfig);

    const fieldsToSelect = uniq([
      mainField,
      PUBLISHED_AT_ATTRIBUTE,
      UPDATED_AT_ATTRIBUTE,
      'documentId',
    ]);

    if (isTargetLocalized) {
      fieldsToSelect.push('locale');
    }

    return {
      entryId,
      locale,
      status,
      attribute,
      fieldsToSelect,
      mainField,
      source: { schema: sourceSchema, isLocalized: isSourceLocalized },
      target: { schema: targetSchema, isLocalized: isTargetLocalized },
      sourceSchema,
      targetSchema,
      targetField,
    };
  },

  /**
   * Used to find new relations to add in a relational field.
   *
   * Component and document relations are dealt a bit differently (they don't have a document_id).
   */
  async findAvailable(ctx: any) {
    const { id } = ctx.request.query;

    await validateFindAvailable(ctx.request.query);

    const {
      locale,
      status,
      targetField,
      fieldsToSelect,
      mainField,
      source: {
        schema: { uid: sourceUid, modelType: sourceModelType },
        isLocalized: isSourceLocalized,
      },
      target: {
        schema: { uid: targetUid },
        isLocalized: isTargetLocalized,
      },
    } = await this.extractAndValidateRequestInfo(ctx, id);

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

    // If no status is requested, we find all the draft relations and later update them
    // with the latest available status
    addFiltersClause(queryParams, {
      publishedAt: getPublishedAtClause(status, targetUid),
    });

    // We will only filter by locale if the target content type is localized
    const filterByLocale = isTargetLocalized && locale;
    if (filterByLocale) {
      addFiltersClause(queryParams, { locale });
    }

    if (id) {
      /**
       * Exclude the relations that are already related to the source
       *
       * We also optionally filter the target relations by the requested
       * status and locale if provided.
       */
      const subQuery = strapi.db.queryBuilder(sourceUid);

      // The alias refers to the DB table of the target content type model
      const alias = subQuery.getAlias();

      const where: Record<string, any> = {
        [`${alias}.id`]: { $notNull: true },
        [`${alias}.document_id`]: { $notNull: true },
      };

      /**
       * Content Types -> Specify document id
       * Components    -> Specify entity id (they don't have a document id)
       */
      if (sourceModelType === 'contentType') {
        where.document_id = id;
      } else {
        where.id = id;
      }

      // Add the status and locale filters if they are provided
      const publishedAt = getPublishedAtClause(status, targetUid);
      if (!isEmpty(publishedAt)) {
        where[`${alias}.published_at`] = publishedAt;
      }

      // If target has localization we need to filter by locale
      if (isTargetLocalized && locale) {
        where[`${alias}.locale`] = locale;
      }

      if (isSourceLocalized && locale) {
        where.locale = locale;
      }

      /**
       * UI can provide a list of ids to omit,
       * those are the relations user set in the UI but has not persisted.
       * We don't want to include them in the available relations.
       */
      if ((idsToInclude?.length ?? 0) !== 0) {
        where[`${alias}.id`].$notIn = idsToInclude;
      }

      const knexSubQuery = subQuery
        .where(where)
        .join({ alias, targetField })
        .select(`${alias}.id`)
        .getKnexQuery();

      addFiltersClause(queryParams, {
        id: { $notIn: knexSubQuery },
      });
    }

    /**
     * Apply a filter to the mainField based on the search query and filter operator
     * searching should be allowed only on mainField for permission reasons
     */
    if (_q) {
      const _filter = isOperatorOfType('where', query._filter) ? query._filter : '$containsi';
      addFiltersClause(queryParams, { [mainField]: { [_filter]: _q } });
    }

    if (idsToOmit?.length > 0) {
      // If we have ids to omit, we should filter them out
      addFiltersClause(queryParams, {
        id: { $notIn: uniq(idsToOmit) },
      });
    }

    const dbQuery = strapi.get('query-params').transform(targetUid, queryParams);

    const res = await strapi.db.query(targetUid).findPage(dbQuery);

    ctx.body = {
      ...res,
      results: await addStatusToRelations(targetUid, res.results),
    };
  },

  async findExisting(ctx: any) {
    const { userAbility } = ctx.state;
    const { id } = ctx.params;

    await validateFindExisting(ctx.request.query);

    const {
      entryId,
      attribute,
      targetField,
      fieldsToSelect,
      status,
      source: { schema: sourceSchema },
      target: { schema: targetSchema },
    } = await this.extractAndValidateRequestInfo(ctx, id);

    const { uid: sourceUid } = sourceSchema;
    const { uid: targetUid } = targetSchema;

    const permissionQuery = await getService('permission-checker')
      .create({ userAbility, model: targetUid })
      .sanitizedQuery.read({ fields: fieldsToSelect });

    /**
     * loadPages can not be used for single relations,
     * this unifies the loading regardless of it's type
     *
     * NOTE: Relations need to be loaded using any db.query method
     *       to ensure the proper ordering is applied
     */
    const dbQuery = strapi.db.query(sourceUid);
    const loadRelations = relations.isAnyToMany(attribute)
      ? (...args: Parameters<typeof dbQuery.loadPages>) => dbQuery.loadPages(...args)
      : (...args: Parameters<typeof dbQuery.load>) =>
          dbQuery
            .load(...args)
            // Ensure response is an array
            .then((res) => ({ results: res ? [res] : [] }));

    const filters: {
      publishedAt?: Record<string, any>;
    } = {};

    if (sourceSchema?.options?.draftAndPublish) {
      if (targetSchema?.options?.draftAndPublish) {
        if (status === 'published') {
          filters.publishedAt = { $notNull: true };
        } else {
          filters.publishedAt = { $null: true };
        }
      }
    } else if (targetSchema?.options?.draftAndPublish) {
      // NOTE: we must return the drafts as some targets might not have a published version yet
      filters.publishedAt = { $null: true };
    }

    /**
     * If user does not have access to specific relations (custom conditions),
     * only the ids of the relations are returned.
     *
     * - First query loads all the ids.
     * - Second one also loads the main field, and excludes forbidden relations.
     *
     * The response contains the union of the two queries.
     */
    const res = await loadRelations({ id: entryId }, targetField, {
      select: ['id', 'documentId', 'locale', 'publishedAt', 'updatedAt'],
      ordering: 'desc',
      page: ctx.request.query.page,
      pageSize: ctx.request.query.pageSize,
      filters,
    });

    /**
     * Add all ids to load in permissionQuery
     * If any of the relations are not accessible, the permissionQuery will exclude them
     */
    const loadedIds = res.results.map((item: any) => item.id);
    addFiltersClause(permissionQuery, { id: { $in: loadedIds } });

    /**
     * Load the relations with the main field, the sanitized permission query
     * will exclude the relations the user does not have access to.
     *
     * Pagination is not necessary as the permissionQuery contains the ids to load.
     */
    const sanitizedRes = await loadRelations({ id: entryId }, targetField, {
      ...strapi.get('query-params').transform(targetUid, permissionQuery),
      ordering: 'desc',
    });

    // NOTE: the order is very import to make sure sanitized relations are kept in priority
    const relationsUnion = uniqBy('id', concat(sanitizedRes.results, res.results));

    ctx.body = {
      pagination: res.pagination || {
        page: 1,
        pageCount: 1,
        pageSize: 10,
        total: relationsUnion.length,
      },
      results: await addStatusToRelations(targetUid, relationsUnion),
    };
  },
};
