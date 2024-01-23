/**
 * This hook doesn't use a context provider because we fetch directly from the server,
 * this sounds expensive but actually, it's really not. Because we have redux-toolkit-query
 * being a cache layer so if nothing invalidates the cache, we don't fetch again.
 */
import * as React from 'react';

import {
  type TrackingEvent,
  useAPIErrorHandler,
  useNotification,
  useTracking,
} from '@strapi/helper-plugin';

import { useDeleteDocumentMutation } from '../services/documents';
import { getTranslation } from '../utils/translations';

import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';

interface DocumentOperationArgs {
  collectionType: string;
  model: string;
  id: string;
}

type UseDocument = () => {
  //   create: () => Promise<void>;
  delete: (
    { collectionType, model, id }: DocumentOperationArgs,
    trackerProperty?: Extract<
      TrackingEvent,
      { name: 'willDeleteEntry' | 'didDeleteEntry' | 'didNotDeleteEntry' }
    >['properties']
  ) => Promise<Contracts.SingleTypes.Delete.Response>;
  //   document?: Contracts.CollectionTypes.FindOne.Response;
  //   isLoading: boolean;
  //   publish: () => Promise<void>;
  //   update: () => Promise<void>;
  //   unpublish: () => Promise<void>;
};

type IUseDocument = ReturnType<UseDocument>;

/**
 * @alpha
 * @description
 * @example
 */
const useDocumentOperations: UseDocument = () => {
  const toggleNotification = useNotification();
  const { trackUsage } = useTracking();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  const [deleteDocument] = useDeleteDocumentMutation();
  const _delete: IUseDocument['delete'] = React.useCallback(
    async ({ collectionType, model, id }, trackerProperty) => {
      try {
        trackUsage('willDeleteEntry', trackerProperty);

        const res = await deleteDocument({
          collectionType,
          model,
          id,
        });

        if ('error' in res) {
          toggleNotification({
            type: 'warning',
            message: formatAPIError(res.error),
          });

          return res.error;
        }

        toggleNotification({
          type: 'success',
          message: {
            id: getTranslation('success.record.delete'),
            defaultMessage: 'Deleted document',
          },
        });

        trackUsage('didDeleteEntry', trackerProperty);

        return res.data;
      } catch (err) {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error', defaultMessage: 'Unable to delete document' },
        });

        trackUsage('didNotDeleteEntry', { error: err, ...trackerProperty });

        throw err;
      }
    },
    [trackUsage, deleteDocument, toggleNotification, formatAPIError]
  );

  return {
    delete: _delete,
  } satisfies ReturnType<UseDocument>;
};

export { useDocumentOperations };
