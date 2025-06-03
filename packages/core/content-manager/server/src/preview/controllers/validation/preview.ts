import * as yup from 'yup';
import { pick } from 'lodash/fp';

import type { Core, UID } from '@strapi/types';
import { validateYupSchema, errors } from '@strapi/utils';

import { Preview } from '../../../../../shared/contracts';
import type { HandlerParams } from '../../services/preview-config';

const getPreviewUrlSchema = yup
  .object()
  .shape({
    // Will be undefined for single types
    documentId: yup.string(),
    locale: yup.string().nullable(),
    status: yup.string(),
  })
  .required();

export const validatePreviewUrl = async (
  strapi: Core.Strapi,
  uid: UID.ContentType,
  params: Preview.GetPreviewUrl.Request['query']
): Promise<HandlerParams> => {
  // Validate the request parameters format
  await validateYupSchema(getPreviewUrlSchema)(params);

  const newParams = pick(['documentId', 'locale', 'status'], params) as HandlerParams;
  const model = strapi.getModel(uid);

  // If it's not a collection type or single type
  if (!model || model.modelType !== 'contentType') {
    throw new errors.ValidationError('Invalid content type');
  }

  // Document id is not required for single types
  const isSingleType = model?.kind === 'singleType';
  if (!isSingleType && !params.documentId) {
    throw new errors.ValidationError('documentId is required for Collection Types');
  }

  // Fill the documentId if it's a single type
  if (isSingleType) {
    const doc = await strapi.documents(uid).findFirst();

    if (!doc) {
      throw new errors.NotFoundError('Document not found');
    }

    newParams.documentId = doc?.documentId;
  }

  /**
   * If status is not specified, follow the following rules:
   * - D&P disabled: status is considered published
   * - D&P enabled: status is considered draft
   */
  if (!newParams.status) {
    const isDPEnabled = model?.options?.draftAndPublish;
    newParams.status = isDPEnabled ? 'draft' : 'published';
  }

  return newParams;
};
