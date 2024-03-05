import { prop, uniq, flow } from 'lodash/fp';
import { isOperatorOfType, contentTypes } from '@strapi/utils';
import { type Common, type Entity, type Documents } from '@strapi/types';
import { errors } from '@strapi/utils';
import { getService } from '../utils';
import { validateFindAvailable, validateFindExisting } from './validation/relations';
import { isListable } from '../services/utils/configuration/attributes';
import { areDatesEqual } from '../utils/dates';

const { PUBLISHED_AT_ATTRIBUTE, UPDATED_AT_ATTRIBUTE } = contentTypes.constants;

interface RelationEntity {
  id: Entity.ID;
  documentId: Documents.ID;
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
    id?: Entity.ID,
    locale?: Documents.Params.Locale,
    status?: Documents.Params.PublicationState.Kind
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
    if (!isSourceComponent && locale) {
      where.locale = locale;
    }

    if (id) {
      if (!isSourceComponent) {
        where.documentId = id;

        if (status) {
          where.publishedAt = status === 'published' ? { $ne: null } : null;
        }
      } else {
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

    const fieldsToSelect = uniq([
      mainField,
      PUBLISHED_AT_ATTRIBUTE,
      UPDATED_AT_ATTRIBUTE,
      'documentId',
    ]);

    // @ts-expect-error TODO improve i18n detection
    if (targetSchema?.pluginOptions?.i18n?.localized) {
      fieldsToSelect.push('locale');
    }

    return {
      attribute,
      fieldsToSelect,
      mainField,
      sourceSchema,
      targetSchema,
      targetField,
    };
  },

  async find(ctx: any, id: Entity.ID, available: boolean = true) {
    const locale = ctx.request?.query?.locale || null;
    const status = ctx.request?.query?.status || null;

    const validation = await this.extractAndValidateRequestInfo(ctx, id, locale, status);

    const {
      targetField,
      fieldsToSelect,
      mainField,
      sourceSchema: { uid: sourceUid, modelType: sourceModelType },
      targetSchema: { uid: targetUid },
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

    // We are looking for available content type relations and should be
    // filtering by valid documentIds only
    if (idsToOmit?.length > 0) {
      addFiltersClause(queryParams, {
        documentId: { $notIn: uniq(idsToOmit) },
      });
    }

    if (status) {
      addFiltersClause(queryParams, {
        publishedAt: status === 'published' ? { $ne: null } : null,
      });
    }

    if (id) {
      // If we have been given an id (document or entity), we need to filter out the
      // relations that are already linked to the current id
      const subQuery = strapi.db.queryBuilder(sourceUid);

      // The alias refers to the DB table of the target content type model
      const alias = subQuery.getAlias();

      const where: Record<string, any> = {
        [`${alias}.id`]: { $notNull: true },
        [`${alias}.document_id`]: { $notNull: true },
      };

      const isSourceComponent = sourceModelType === 'component';
      if (isSourceComponent) {
        // If the source is a component, we need to filter by the component's
        // numeric entity id
        where.id = id;
      } else {
        // If the source is a content type, we need to filter by document id
        where.document_id = id;

        if (status) {
          where.publishedAt = status === 'published' ? { $ne: null } : null;
        }
        if (locale) {
          where.locale = locale;
        }
      }

      if ((idsToInclude?.length ?? 0) !== 0) {
        where[`${alias}.document_id`].$notIn = idsToInclude;
      }

      const knexSubQuery = subQuery
        .where(where)
        .join({ alias, targetField })
        .select(`${alias}.document_id`)
        .getKnexQuery();

      addFiltersClause(queryParams, {
        // If finding available we want to add a filter to exclude the
        // documentIds found by the subQuery
        // And the opposite if finding existing
        documentId: available ? { $notIn: knexSubQuery } : { $in: knexSubQuery },
      });
    }

    if (_q) {
      // searching should be allowed only on mainField for permission reasons
      const _filter = isOperatorOfType('where', query._filter) ? query._filter : '$containsi';
      addFiltersClause(queryParams, { [mainField]: { [_filter]: _q } });
    }

    const res = await strapi.entityService.findPage(
      targetUid as Common.UID.ContentType,
      queryParams
    );

    const resultsGroupedByDocId: Record<string, RelationEntity[]> = res.results.reduce(
      // TODO improve types
      (acc: any, result) => {
        const documentId = result.documentId;
        acc[documentId] = acc[documentId] || [];
        acc[documentId].push(result);
        return acc;
      },
      {}
    );

    const latestEntryForEachRelation = Object.values(resultsGroupedByDocId).reduce<
      RelationEntity[]
    >((acc, docIdResults) => {
      if (docIdResults.length === 1) {
        acc.push(docIdResults[0]);
      } else {
        const equalDates = areDatesEqual(docIdResults[0].updatedAt, docIdResults[1].updatedAt, 500);
        const latestEntry = equalDates
          ? docIdResults.find((entity) => entity.publishedAt)
          : docIdResults.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))[0];

        if (latestEntry) {
          acc.push(latestEntry);
        }
      }
      return acc;
    }, []);

    ctx.body = {
      ...res,
      results: latestEntryForEachRelation,
    };
  },

  async findAvailable(ctx: any) {
    const { id } = ctx.request.query;

    await validateFindAvailable(ctx.request.query);
    await this.find(ctx, id, true);
  },

  async findExisting(ctx: any) {
    const { id } = ctx.params;

    await validateFindExisting(ctx.request.query);
    await this.find(ctx, id, false);
  },
};
