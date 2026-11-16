import { errors, z } from '@strapi/utils';
import type { Core, UID } from '@strapi/types';

import { getService as getContentManagerService } from '../../utils';
import { getDocumentLocaleAndStatus } from '../../controllers/validation/dimensions';
import { validateZodAsync } from '../../validation/zod';
import { getService, isFeatureEnabled } from '../utils';
import type { CustomOrder } from '../../../../shared/contracts';

// Not strict: like for the other document actions, i18n adds the locale of the request to the body
const moveInputSchema = z
  .looseObject({
    before: z.string().min(1).optional(),
    after: z.string().min(1).optional(),
  })
  .refine(({ before, after }) => (before === undefined) !== (after === undefined), {
    error: 'Expected either "before" or "after" to be the documentId of another entry',
  });

const validateMoveInput = validateZodAsync(moveInputSchema);

const createCustomOrderController = ({ strapi }: { strapi: Core.Strapi }) => {
  return {
    async move(ctx) {
      if (!isFeatureEnabled(strapi)) {
        return ctx.notFound();
      }

      const { userAbility } = ctx.state;
      const { id } = ctx.params as CustomOrder.MoveDocument.Params;
      const model = ctx.params.model as UID.CollectionType;
      const { body } = ctx.request;

      const { before, after } = await validateMoveInput(body);

      const placement = before !== undefined ? 'before' : 'after';
      const anchorId = before ?? after;

      if (anchorId === undefined || anchorId === id) {
        throw new errors.ValidationError('An entry cannot be moved next to itself');
      }

      const customOrder = getService(strapi, 'custom-order');

      // The setting may have just been turned on from another instance
      if (!customOrder.isEnabled(model)) {
        await customOrder.refresh();
      }

      if (!customOrder.isEnabled(model)) {
        throw new errors.ValidationError('Custom order is not enabled for this content type');
      }

      const permissionChecker = getContentManagerService('permission-checker').create({
        userAbility,
        model,
      });

      if (permissionChecker.cannot.update()) {
        return ctx.forbidden();
      }

      const permissionQuery = await permissionChecker.sanitizedQuery.update(ctx.query);
      const populate = await getContentManagerService('populate-builder')(model)
        .populateFromQuery(permissionQuery)
        .build();

      const { locale } = await getDocumentLocaleAndStatus(body, model);
      const document = await getContentManagerService('document-manager').findOne(id, model, {
        populate,
        locale,
      });

      if (!document) {
        return ctx.notFound();
      }

      if (permissionChecker.cannot.update(document)) {
        return ctx.forbidden();
      }

      await customOrder.move({ uid: model, documentId: id, anchorId, placement });

      return {
        data: { documentId: id },
      } satisfies CustomOrder.MoveDocument.Response;
    },
  } satisfies Core.Controller;
};

export { createCustomOrderController };
