import * as React from 'react';

import {
  TrackingEvent,
  formatContentTypeData,
  useAPIErrorHandler,
  useGuidedTour,
  useNotification,
  useQueryParams,
  useTracking,
} from '@strapi/helper-plugin';
import { useNavigate } from 'react-router-dom';

import { useTypedDispatch, useTypedSelector } from '../../core/store/hooks';
import { useFindRedirectionLink } from '../hooks/useFindRedirectionLink';
import {
  useCloneDocumentMutation,
  useCreateDocumentMutation,
  useDeleteDocumentMutation,
  useGetDocumentQuery,
  useGetDraftRelationCountQuery,
  usePublishDocumentMutation,
  useUnpublishDocumentMutation,
  useUpdateDocumentMutation,
} from '../services/documents';
import {
  getData,
  getDataSucceeded,
  initForm,
  resetProps,
  setDataStructures,
  setStatus,
  submitSucceeded,
} from '../sharedReducers/crud/actions';
import { buildValidGetParams } from '../utils/api';
import { createDefaultDataStructure, removePasswordFieldsFromData } from '../utils/data';
import { getTranslation } from '../utils/translations';

import type { EditViewPageParams } from '../pages/EditView/EditViewPage';
import type { EntityData } from '../sharedReducers/crud/reducer';
import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';

interface RenderChildProps {
  componentsDataStructure: Record<string, any>;
  contentTypeDataStructure: Record<string, any>;
  data: EntityData | null;
  isCreatingEntry: boolean;
  isLoadingForData: boolean;
  onDelete: (
    trackerProperty: Extract<
      TrackingEvent,
      { name: 'willDeleteEntry' | 'didDeleteEntry' | 'didNotDeleteEntry' }
    >['properties']
  ) => Promise<Contracts.SingleTypes.Delete.Response>;
  onPost: (
    body: Contracts.SingleTypes.CreateOrUpdate.Request['body'],
    trackerProperty: Extract<
      TrackingEvent,
      { name: 'willCreateEntry' | 'didCreateEntry' | 'didNotCreateEntry' }
    >['properties']
  ) => Promise<Contracts.SingleTypes.CreateOrUpdate.Response>;
  onDraftRelationCheck: () => Promise<Contracts.SingleTypes.CountDraftRelations.Response['data']>;
  onPublish: () => Promise<Contracts.SingleTypes.Publish.Response>;
  onPut: (
    body: Contracts.SingleTypes.CreateOrUpdate.Request['body'],
    trackerProperty: Extract<
      TrackingEvent,
      { name: 'willEditEntry' | 'didEditEntry' | 'didNotEditEntry' }
    >['properties']
  ) => Promise<Contracts.SingleTypes.CreateOrUpdate.Response>;
  onUnpublish: () => Promise<Contracts.SingleTypes.UnPublish.Response>;
  redirectionLink: string;
  status: string;
}

interface ContentTypeFormWrapperProps extends EditViewPageParams {
  children: (props: RenderChildProps) => React.JSX.Element;
}

// This container is used to handle the CRUD
const ContentTypeFormWrapper = ({
  children,
  slug,
  id = '',
  origin,
  collectionType,
}: ContentTypeFormWrapperProps) => {
  const allLayoutData = useTypedSelector(
    (state) => state['content-manager_editViewLayoutManager'].currentLayout
  );
  const toggleNotification = useNotification();
  const { setCurrentStep } = useGuidedTour();
  const { trackUsage } = useTracking();
  const navigate = useNavigate();
  const [{ query, rawQuery }] = useQueryParams();
  const dispatch = useTypedDispatch();
  const { componentsDataStructure, contentTypeDataStructure, data, isLoading, status } =
    useTypedSelector((state) => state['content-manager_editViewCrudReducer']);
  const redirectionLink = useFindRedirectionLink(slug);
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler(getTranslation);

  const isSingleType = collectionType === 'single-types';
  const params = React.useMemo(() => buildValidGetParams(query), [query]);
  const isCreatingEntry = !isSingleType && id === 'create';

  const cleanReceivedData = React.useCallback(
    (data: EntityData) => {
      const cleaned = removePasswordFieldsFromData(
        data,
        allLayoutData.contentType!,
        allLayoutData.components
      );

      return formatContentTypeData(cleaned, allLayoutData.contentType!, allLayoutData.components);
    },
    [allLayoutData]
  );

  // SET THE DEFAULT LAYOUT the effect is applied when the slug changes
  React.useEffect(() => {
    const componentsDataStructure = Object.keys(allLayoutData.components).reduce<
      Record<string, any>
    >((acc, current) => {
      const defaultComponentForm = createDefaultDataStructure(
        allLayoutData.components[current].attributes,
        allLayoutData.components
      );

      acc[current] = formatContentTypeData(
        defaultComponentForm,
        // @ts-expect-error – the helper-plugin doesn't (and can't) know about the types we have in the admin. TODO: fix this.
        allLayoutData.components[current],
        allLayoutData.components
      );

      return acc;
    }, {});

    const contentTypeDataStructure = createDefaultDataStructure(
      allLayoutData.contentType!.attributes,
      allLayoutData.components
    );

    const contentTypeDataStructureFormatted = formatContentTypeData(
      contentTypeDataStructure,
      allLayoutData.contentType!,
      allLayoutData.components
    );

    dispatch(setDataStructures(componentsDataStructure, contentTypeDataStructureFormatted));
  }, [allLayoutData, dispatch]);

  React.useEffect(() => {
    return () => {
      dispatch(resetProps());
    };
  }, [dispatch]);

  const getDocumentResponse = useGetDocumentQuery(
    {
      collectionType,
      model: slug,
      id: origin || id,
      params,
    },
    {
      skip: isCreatingEntry && !origin,
      refetchOnMountOrArgChange: true,
    }
  );

  /**
   * TODO: get rid of the CRUD reducer.
   */
  React.useEffect(() => {
    if (isCreatingEntry && !origin) {
      dispatch(getData());
      dispatch(initForm(rawQuery));

      return;
    }

    dispatch(getData());
  }, [dispatch, isCreatingEntry, origin, rawQuery]);

  React.useEffect(() => {
    if (getDocumentResponse.data && getDocumentResponse.isSuccess) {
      dispatch(getDataSucceeded(cleanReceivedData(getDocumentResponse.data)));
    }
  }, [cleanReceivedData, dispatch, getDocumentResponse.data, getDocumentResponse.isSuccess]);

  React.useEffect(() => {
    if (
      getDocumentResponse.error &&
      'status' in getDocumentResponse.error &&
      getDocumentResponse.error.status === 404
    ) {
      if (isSingleType) {
        dispatch(initForm(rawQuery, true));
      } else {
        navigate(redirectionLink);
      }
    }
  }, [dispatch, getDocumentResponse.error, isSingleType, navigate, rawQuery, redirectionLink]);

  const [deleteDocument] = useDeleteDocumentMutation();
  const onDelete: RenderChildProps['onDelete'] = React.useCallback(
    async (trackerProperty) => {
      try {
        trackUsage('willDeleteEntry', trackerProperty);

        const res = await deleteDocument({
          collectionType,
          model: slug,
          id,
        });

        if ('error' in res) {
          return Promise.reject(res.error);
        }

        toggleNotification({
          type: 'success',
          message: { id: getTranslation('success.record.delete') },
        });

        trackUsage('didDeleteEntry', trackerProperty);

        if (isSingleType) {
          dispatch(initForm(rawQuery, true));
        } else {
          navigate(redirectionLink, { replace: true });
        }

        return Promise.resolve(res.data);
      } catch (err) {
        trackUsage('didNotDeleteEntry', { error: err, ...trackerProperty });

        return Promise.reject(err);
      }
    },
    [
      trackUsage,
      deleteDocument,
      collectionType,
      slug,
      id,
      toggleNotification,
      isSingleType,
      dispatch,
      rawQuery,
      navigate,
      redirectionLink,
    ]
  );

  const [createDocument] = useCreateDocumentMutation();
  const [cloneDocument] = useCloneDocumentMutation();
  const onPost: RenderChildProps['onPost'] = React.useCallback(
    async (body, trackerProperty) => {
      const isCloning = typeof origin === 'string';
      try {
        // Show a loading button in the EditView/Header.js && lock the app => no navigation
        dispatch(setStatus('submit-pending'));

        const { id: _id, ...restBody } = body;

        if (isCloning) {
          /**
           * If we're cloning we want to post directly to this endpoint
           * so that the relations even if they're not listed in the EditView
           * are correctly attached to the entry.
           */
          const res = await cloneDocument({
            model: slug,
            sourceId: origin,
            data: restBody,
            params,
          });

          if ('error' in res) {
            toggleNotification({ type: 'warning', message: formatAPIError(res.error) });

            trackUsage('didNotCreateEntry', { error: res.error, ...trackerProperty });

            return Promise.reject(res.error);
          }

          trackUsage('didCreateEntry', trackerProperty);
          toggleNotification({
            type: 'success',
            message: { id: getTranslation('success.record.save') },
          });

          setCurrentStep('contentManager.success');

          dispatch(submitSucceeded(cleanReceivedData(res.data)));

          if (!isSingleType) {
            navigate(
              {
                // @ts-expect-error – TODO: look into this, the type is probably wrong.
                pathname: `/content-manager/collection-types/${slug}/${res.data.id}`,
                search: rawQuery,
              },
              {
                replace: true,
              }
            );
          }

          return Promise.resolve(res.data);
        } else {
          const res = await createDocument({
            model: slug,
            data: body,
            params: query,
          });

          if ('error' in res) {
            toggleNotification({ type: 'warning', message: formatAPIError(res.error) });

            trackUsage('didNotCreateEntry', { error: res.error, ...trackerProperty });

            return Promise.reject(res.error);
          }

          trackUsage('didCreateEntry', trackerProperty);
          toggleNotification({
            type: 'success',
            message: { id: getTranslation('success.record.save') },
          });

          setCurrentStep('contentManager.success');

          dispatch(submitSucceeded(cleanReceivedData(res.data)));

          if (!isSingleType) {
            navigate(
              {
                // @ts-expect-error – TODO: look into this, the type is probably wrong.
                pathname: `/content-manager/collection-types/${slug}/${res.data.id}`,
                search: rawQuery,
              },
              {
                replace: true,
              }
            );
          }

          return Promise.resolve(res.data);
        }
      } catch (err) {
        toggleNotification({
          type: 'warning',
          message: {
            id: 'notification.error',
            defaultMessage: 'An error occurred, please try again',
          },
        });

        trackUsage('didNotCreateEntry', { error: err, ...trackerProperty });

        return Promise.reject(err);
      } finally {
        // Enable navigation and remove loaders
        dispatch(setStatus('resolved'));
      }
    },
    [
      origin,
      dispatch,
      cloneDocument,
      slug,
      query,
      trackUsage,
      toggleNotification,
      setCurrentStep,
      cleanReceivedData,
      isSingleType,
      formatAPIError,
      navigate,
      rawQuery,
      createDocument,
    ]
  );

  const [getDraftRelationCount] = useGetDraftRelationCountQuery();
  const onDraftRelationCheck: RenderChildProps['onDraftRelationCheck'] =
    React.useCallback(async () => {
      try {
        trackUsage('willCheckDraftRelations');

        dispatch(setStatus('draft-relation-check-pending'));

        const res = await getDraftRelationCount({
          collectionType,
          model: slug,
          id,
        });

        if ('error' in res && res.error) {
          toggleNotification({ type: 'warning', message: formatAPIError(res.error) });

          return Promise.reject(res.error);
        }

        trackUsage('didCheckDraftRelations');

        return res.data ?? 0;
      } catch (err) {
        toggleNotification({
          type: 'warning',
          message: {
            id: 'notification.error',
            defaultMessage: 'An error occurred, please try again',
          },
        });

        return Promise.reject(err);
      } finally {
        dispatch(setStatus('resolved'));
      }
    }, [
      trackUsage,
      dispatch,
      getDraftRelationCount,
      collectionType,
      slug,
      id,
      toggleNotification,
      formatAPIError,
    ]);

  const [publishDocument] = usePublishDocumentMutation();
  const onPublish: RenderChildProps['onPublish'] = React.useCallback(async () => {
    try {
      trackUsage('willPublishEntry');

      dispatch(setStatus('publish-pending'));

      const res = await publishDocument({
        collectionType,
        model: slug,
        id,
      });

      if ('error' in res) {
        toggleNotification({ type: 'warning', message: formatAPIError(res.error) });
        return Promise.reject(res.error);
      }

      trackUsage('didPublishEntry');

      toggleNotification({
        type: 'success',
        message: { id: getTranslation('success.record.publish') },
      });

      return Promise.resolve(res.data);
    } catch (err) {
      toggleNotification({
        type: 'warning',
        message: {
          id: 'notification.error',
          defaultMessage: 'An error occurred, please try again',
        },
      });

      return Promise.reject(err);
    } finally {
      dispatch(setStatus('resolved'));
    }
  }, [
    trackUsage,
    dispatch,
    publishDocument,
    collectionType,
    slug,
    id,
    toggleNotification,
    formatAPIError,
  ]);

  const [updateDocument] = useUpdateDocumentMutation();
  const onPut: RenderChildProps['onPut'] = React.useCallback(
    async (body, trackerProperty) => {
      try {
        trackUsage('willEditEntry', trackerProperty);

        dispatch(setStatus('submit-pending'));

        const res = await updateDocument({
          collectionType,
          model: slug,
          id,
          data: body,
          params: query,
        });

        if ('error' in res) {
          toggleNotification({ type: 'warning', message: formatAPIError(res.error) });

          trackUsage('didNotEditEntry', { error: res.error, ...trackerProperty });

          return Promise.reject(res.error);
        }

        trackUsage('didEditEntry', trackerProperty);
        toggleNotification({
          type: 'success',
          message: { id: getTranslation('success.record.save') },
        });

        dispatch(submitSucceeded(cleanReceivedData(res.data)));

        return Promise.resolve(res.data);
      } catch (err) {
        trackUsage('didNotEditEntry', { error: err, ...trackerProperty });

        toggleNotification({
          type: 'warning',
          message: {
            id: 'notification.error',
            defaultMessage: 'An error occurred, please try again',
          },
        });

        return Promise.reject(err);
      } finally {
        dispatch(setStatus('resolved'));
      }
    },
    [
      trackUsage,
      dispatch,
      updateDocument,
      collectionType,
      slug,
      id,
      query,
      toggleNotification,
      cleanReceivedData,
      formatAPIError,
    ]
  );

  const [unpublishDocument] = useUnpublishDocumentMutation();
  const onUnpublish: RenderChildProps['onUnpublish'] = React.useCallback(async () => {
    dispatch(setStatus('unpublish-pending'));

    try {
      trackUsage('willUnpublishEntry');

      const res = await unpublishDocument({
        collectionType,
        model: slug,
        id,
      });

      if ('error' in res) {
        toggleNotification({ type: 'warning', message: formatAPIError(res.error) });

        return Promise.reject(res.error);
      }

      trackUsage('didUnpublishEntry');

      toggleNotification({
        type: 'success',
        message: { id: getTranslation('success.record.unpublish') },
      });

      return Promise.resolve(res.data);
    } catch (err) {
      toggleNotification({
        type: 'warning',
        message: {
          id: 'notification.error',
          defaultMessage: 'An error occurred, please try again',
        },
      });

      return Promise.reject(err);
    } finally {
      dispatch(setStatus('resolved'));
    }
  }, [
    dispatch,
    trackUsage,
    unpublishDocument,
    collectionType,
    slug,
    id,
    toggleNotification,
    formatAPIError,
  ]);

  return children({
    componentsDataStructure,
    contentTypeDataStructure,
    data,
    isCreatingEntry,
    isLoadingForData: isLoading,
    onDelete,
    onPost,
    onPublish,
    onDraftRelationCheck,
    onPut,
    onUnpublish,
    status,
    redirectionLink,
  });
};

export { ContentTypeFormWrapper };
export type { ContentTypeFormWrapperProps, RenderChildProps };
