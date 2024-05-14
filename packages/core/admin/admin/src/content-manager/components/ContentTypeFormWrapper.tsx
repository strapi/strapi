import * as React from 'react';

import {
  ApiError,
  TrackingEvent,
  formatContentTypeData,
  useAPIErrorHandler,
  useFetchClient,
  useGuidedTour,
  useNotification,
  useQueryParams,
  useTracking,
} from '@strapi/helper-plugin';
import axios, { AxiosError, AxiosResponse, CancelTokenSource } from 'axios';
import get from 'lodash/get';
import { useQueryClient } from 'react-query';
import { useHistory } from 'react-router-dom';

import { useTypedDispatch, useTypedSelector } from '../../core/store/hooks';
import { useFindRedirectionLink } from '../hooks/useFindRedirectionLink';
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
  onUnpublish: () => Promise<void>;
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
  const queryClient = useQueryClient();
  const toggleNotification = useNotification();
  const { setCurrentStep } = useGuidedTour();
  const { trackUsage } = useTracking();
  const { push, replace } = useHistory();
  const [{ query, rawQuery }] = useQueryParams<{
    plugins?: {
      i18n?: {
        locale?: string;
      };
    };
  }>();
  const dispatch = useTypedDispatch();
  const { componentsDataStructure, contentTypeDataStructure, data, isLoading, status } =
    useTypedSelector((state) => state['content-manager_editViewCrudReducer']);
  const redirectionLink = useFindRedirectionLink(slug);
  const { formatAPIError } = useAPIErrorHandler(getTranslation);

  const isMounted = React.useRef(true);

  const fetchClient = useFetchClient();
  const { put, post, del } = fetchClient;

  const isSingleType = collectionType === 'single-types';
  const isCreatingEntry = !isSingleType && !id;

  const requestURL =
    isCreatingEntry && !origin
      ? null
      : `/content-manager/${collectionType}/${slug}/${origin || id}`;

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

  const validParams = React.useMemo(() => buildValidGetParams(query), [query]);

  React.useEffect(() => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();

    const fetchData = async (source: CancelTokenSource) => {
      if (!requestURL) {
        return;
      }

      dispatch(getData());

      try {
        const { data } = await fetchClient.get(requestURL, {
          cancelToken: source.token,
          params: validParams,
        });

        dispatch(getDataSucceeded(cleanReceivedData(data)));
      } catch (err) {
        if (axios.isCancel(err)) {
          return;
        }
        const resStatus = get(err, 'response.status', null);

        if (resStatus === 404 && !isSingleType) {
          push(redirectionLink);

          return;
        } else if (resStatus === 404 && isSingleType) {
          // Creating a single type
          dispatch(initForm(rawQuery, true));
        }

        // Not allowed to read a document
        if (resStatus === 403) {
          toggleNotification({
            type: 'info',
            message: { id: getTranslation('permissions.not-allowed.update') },
          });

          push(redirectionLink);
        }
      }
    };

    // This is needed in order to reset the form when the query changes
    const init = async () => {
      await dispatch(getData());
      dispatch(initForm(rawQuery));
    };

    if (!isMounted.current) {
      return () => {};
    }

    if (requestURL) {
      fetchData(source);
    } else {
      init();
    }

    return () => {
      source.cancel('Operation canceled by the user.');
    };
  }, [
    fetchClient,
    cleanReceivedData,
    push,
    requestURL,
    dispatch,
    rawQuery,
    redirectionLink,
    toggleNotification,
    isSingleType,
    validParams,
  ]);

  const displayErrors = React.useCallback(
    (err: AxiosError<{ error: ApiError }>) => {
      toggleNotification({ type: 'warning', message: formatAPIError(err) });
    },
    [toggleNotification, formatAPIError]
  );

  const onDelete: RenderChildProps['onDelete'] = React.useCallback(
    async (trackerProperty) => {
      try {
        trackUsage('willDeleteEntry', trackerProperty);

        const locale = query?.plugins?.i18n?.locale;
        const params = isSingleType && locale ? { locale } : {};

        const { data } = await del<Contracts.CollectionTypes.Delete.Response>(
          `/content-manager/${collectionType}/${slug}/${id}`,
          { params }
        );

        toggleNotification({
          type: 'success',
          message: { id: getTranslation('success.record.delete') },
        });

        trackUsage('didDeleteEntry', trackerProperty);

        if (isSingleType) {
          dispatch(initForm(rawQuery, true));
        } else {
          replace(redirectionLink);
        }

        return Promise.resolve(data);
      } catch (err) {
        trackUsage('didNotDeleteEntry', { error: err, ...trackerProperty });

        return Promise.reject(err);
      }
    },
    [
      trackUsage,
      del,
      collectionType,
      slug,
      id,
      toggleNotification,
      isSingleType,
      dispatch,
      rawQuery,
      replace,
      redirectionLink,
    ]
  );

  const onPost: RenderChildProps['onPost'] = React.useCallback(
    async (body, trackerProperty) => {
      const isCloning = typeof origin === 'string';
      /**
       * If we're cloning we want to post directly to this endpoint
       * so that the relations even if they're not listed in the EditView
       * are correctly attached to the entry.
       */
      try {
        // Show a loading button in the EditView/Header.js && lock the app => no navigation
        dispatch(setStatus('submit-pending'));

        const { id: _id, ...restBody } = body;

        const { data } = await (isSingleType ? put : post)<
          Contracts.CollectionTypes.Create.Response | Contracts.CollectionTypes.Clone.Response,
          AxiosResponse<
            Contracts.CollectionTypes.Create.Response | Contracts.CollectionTypes.Clone.Response
          >,
          | Contracts.CollectionTypes.Create.Request['body']
          | Contracts.CollectionTypes.Clone.Request['body']
        >(
          isCloning
            ? `/content-manager/${collectionType}/${slug}/clone/${origin}`
            : `/content-manager/${collectionType}/${slug}`,
          isCloning ? restBody : body,
          {
            params: validParams,
          }
        );

        trackUsage('didCreateEntry', trackerProperty);
        toggleNotification({
          type: 'success',
          message: { id: getTranslation('success.record.save') },
        });

        setCurrentStep('contentManager.success');

        // TODO: need to find a better place, or a better abstraction
        queryClient.invalidateQueries(['relation']);

        dispatch(submitSucceeded(cleanReceivedData(data)));

        // Enable navigation and remove loaders
        dispatch(setStatus('resolved'));

        if (!isSingleType) {
          // @ts-expect-error – TODO: look into this, the type is probably wrong.
          replace(`/content-manager/${collectionType}/${slug}/${data.id}${rawQuery}`);
        }

        return Promise.resolve(data);
      } catch (err) {
        if (err instanceof AxiosError) {
          displayErrors(err);
        }

        trackUsage('didNotCreateEntry', { error: err, ...trackerProperty });
        dispatch(setStatus('resolved'));

        return Promise.reject(err);
      }
    },
    [
      origin,
      dispatch,
      collectionType,
      put,
      post,
      slug,
      validParams,
      trackUsage,
      toggleNotification,
      setCurrentStep,
      queryClient,
      cleanReceivedData,
      isSingleType,
      replace,
      rawQuery,
      displayErrors,
    ]
  );

  const onDraftRelationCheck: RenderChildProps['onDraftRelationCheck'] =
    React.useCallback(async () => {
      try {
        trackUsage('willCheckDraftRelations');

        dispatch(setStatus('draft-relation-check-pending'));

        const {
          data: { data },
        } = await fetchClient.get<Contracts.CollectionTypes.CountDraftRelations.Response>(
          isSingleType
            ? `/content-manager/${collectionType}/${slug}/actions/countDraftRelations`
            : `/content-manager/${collectionType}/${slug}/${id}/actions/countDraftRelations`
        );
        trackUsage('didCheckDraftRelations');

        dispatch(setStatus('resolved'));

        return data;
      } catch (err) {
        if (err instanceof AxiosError) {
          displayErrors(err);
        }
        dispatch(setStatus('resolved'));

        return Promise.reject(err);
      }
    }, [trackUsage, dispatch, fetchClient, isSingleType, collectionType, slug, id, displayErrors]);

  const onPublish: RenderChildProps['onPublish'] = React.useCallback(async () => {
    try {
      trackUsage('willPublishEntry');

      dispatch(setStatus('publish-pending'));

      const { data } = await post<Contracts.CollectionTypes.Publish.Response>(
        isSingleType
          ? `/content-manager/${collectionType}/${slug}/actions/publish`
          : `/content-manager/${collectionType}/${slug}/${id}/actions/publish`,
        undefined,
        {
          params: validParams,
        }
      );

      trackUsage('didPublishEntry');

      dispatch(submitSucceeded(cleanReceivedData(data)));
      dispatch(setStatus('resolved'));

      toggleNotification({
        type: 'success',
        message: { id: getTranslation('success.record.publish') },
      });

      return Promise.resolve(data);
    } catch (err) {
      if (err instanceof AxiosError) {
        displayErrors(err);
      }

      dispatch(setStatus('resolved'));

      return Promise.reject(err);
    }
  }, [
    trackUsage,
    dispatch,
    post,
    isSingleType,
    collectionType,
    slug,
    id,
    validParams,
    cleanReceivedData,
    toggleNotification,
    displayErrors,
  ]);

  const onPut: RenderChildProps['onPut'] = React.useCallback(
    async (body, trackerProperty) => {
      try {
        trackUsage('willEditEntry', trackerProperty);

        dispatch(setStatus('submit-pending'));

        const { data } = await put<
          Contracts.CollectionTypes.Update.Response,
          AxiosResponse<Contracts.CollectionTypes.Update.Response>,
          Contracts.CollectionTypes.Update.Request['body']
        >(`/content-manager/${collectionType}/${slug}/${id}`, body, {
          params: validParams,
        });

        trackUsage('didEditEntry', trackerProperty);
        toggleNotification({
          type: 'success',
          message: { id: getTranslation('success.record.save') },
        });

        // TODO: need to find a better place, or a better abstraction
        queryClient.invalidateQueries(['relation']);

        dispatch(submitSucceeded(cleanReceivedData(data)));

        dispatch(setStatus('resolved'));

        return Promise.resolve(data);
      } catch (err) {
        trackUsage('didNotEditEntry', { error: err, ...trackerProperty });

        if (err instanceof AxiosError) {
          displayErrors(err);
        }

        dispatch(setStatus('resolved'));

        return Promise.reject(err);
      }
    },
    [
      trackUsage,
      dispatch,
      put,
      collectionType,
      slug,
      id,
      validParams,
      toggleNotification,
      queryClient,
      cleanReceivedData,
      displayErrors,
    ]
  );

  const onUnpublish: RenderChildProps['onUnpublish'] = React.useCallback(async () => {
    dispatch(setStatus('unpublish-pending'));

    try {
      trackUsage('willUnpublishEntry');

      const { data } = await post<Contracts.CollectionTypes.Unpublish.Response>(
        isSingleType
          ? `/content-manager/${collectionType}/${slug}/actions/unpublish`
          : `/content-manager/${collectionType}/${slug}/${id}/actions/unpublish`,
        undefined,
        {
          params: validParams,
        }
      );

      trackUsage('didUnpublishEntry');
      toggleNotification({
        type: 'success',
        message: { id: getTranslation('success.record.unpublish') },
      });

      dispatch(submitSucceeded(cleanReceivedData(data)));
      dispatch(setStatus('resolved'));
    } catch (err) {
      dispatch(setStatus('resolved'));

      if (err instanceof AxiosError) {
        displayErrors(err);
      }

      return Promise.reject(err);
    }
  }, [
    dispatch,
    trackUsage,
    post,
    isSingleType,
    collectionType,
    slug,
    id,
    validParams,
    toggleNotification,
    cleanReceivedData,
    displayErrors,
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
