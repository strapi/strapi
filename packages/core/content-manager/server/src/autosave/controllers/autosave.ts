import { omit } from 'lodash/fp';
import { errors } from '@strapi/utils';
import type { Core, UID } from '@strapi/types';

import { getService as getContentManagerService } from '../../utils';
import { FIELDS_TO_IGNORE, getSchemaAttributesDiff } from '../../services/utils/schema-diff';
import { getService } from '../utils';
import { CREATE_SESSION_PREFIX } from '../constants';
import { validateSaveAutosave } from './validation/autosave';
import type { Autosave } from '../../../../shared/contracts';

const createAutosaveController = ({ strapi }: { strapi: Core.Strapi }) => {
  /**
   * Autosaves have no permissions of their own: reading your own backup of a document requires
   * the same access as reading the document, and writing one requires being able to edit it.
   */
  const getScope = (ctx: any) => {
    const model = ctx.params.model as UID.ContentType;
    const { documentId } = ctx.params;

    if (!strapi.contentTypes[model]) {
      throw new errors.NotFoundError(`Content type ${model} was not found`);
    }

    if (documentId.startsWith(CREATE_SESSION_PREFIX)) {
      throw new errors.ValidationError('A document that was never created cannot be autosaved');
    }

    const permissionChecker = getContentManagerService('permission-checker').create({
      userAbility: ctx.state.userAbility,
      model,
    });

    return {
      permissionChecker,
      scope: {
        userId: ctx.state.user.id,
        contentType: model,
        documentId,
        locale: (ctx.query.locale as string) ?? null,
      },
    };
  };

  return {
    async find(ctx) {
      const { permissionChecker, scope } = getScope(ctx);

      if (permissionChecker.cannot.read()) {
        throw new errors.ForbiddenError();
      }

      const snapshot = await getService(strapi, 'autosave').findOne(scope);

      if (!snapshot) {
        return { data: null } satisfies Autosave.GetAutosave.Response;
      }

      const { schema, ...entry } = snapshot;
      // A backup written before schemas were recorded has nothing to compare against, so it is
      // taken at face value.
      const unknownAttributes = schema
        ? getSchemaAttributesDiff(schema, strapi.getModel(scope.contentType).attributes)
        : { added: {}, removed: {} };
      // The content type may have changed since the backup was taken, and a field it no longer
      // has cannot be restored into the form, so it is dropped rather than handed back.
      const data = omit(Object.keys(unknownAttributes.removed), entry.data);
      const hasChanged =
        Object.keys(unknownAttributes.added).length > 0 ||
        Object.keys(unknownAttributes.removed).length > 0;

      return {
        data: { ...entry, data: await permissionChecker.sanitizeOutput(data) },
        ...(hasChanged ? { meta: { unknownAttributes } } : {}),
      } satisfies Autosave.GetAutosave.Response;
    },

    async save(ctx) {
      const { permissionChecker, scope } = getScope(ctx);

      if (permissionChecker.cannot.update()) {
        throw new errors.ForbiddenError();
      }

      const body = ctx.request.body as Autosave.SaveAutosave.Request['body'];

      await validateSaveAutosave(body);

      // Never let a backup carry fields the author is not allowed to edit: it is restored
      // straight into the form, and from there into the shared draft.
      const data = await permissionChecker.sanitizeUpdateInput(body.data);
      const { schema: _schema, ...entry } = await getService(strapi, 'autosave').save(scope, {
        data,
        // Recorded alongside the payload so a later Content-Type Builder change can be detected
        // when the backup is read back.
        schema: omit(FIELDS_TO_IGNORE, strapi.getModel(scope.contentType).attributes),
        baseVersion: body.baseVersion,
      });

      return { data: entry } satisfies Autosave.SaveAutosave.Response;
    },

    async delete(ctx) {
      const { permissionChecker, scope } = getScope(ctx);

      if (permissionChecker.cannot.update()) {
        throw new errors.ForbiddenError();
      }

      await getService(strapi, 'autosave').delete(scope);

      return { data: null } satisfies Autosave.DeleteAutosave.Response;
    },
  } satisfies Core.Controller;
};

export { createAutosaveController };
