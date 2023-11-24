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
import {
  getData,
  getDataSucceeded,
  initForm,
  resetProps,
  setDataStructures,
  setStatus,
  submitSucceeded,
} from '../sharedReducers/crud/actions';
import { EntityData } from '../sharedReducers/crud/reducer';
import { buildValidGetParams } from '../utils/api';
import { createDefaultDataStructure, removePasswordFieldsFromData } from '../utils/data';
import { getTranslation } from '../utils/translations';

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
      { name: 'didCreateEntry' | 'didNotCreateEntry' }
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

interface SingleTypeFormWrapperProps {
  slug: string;
  children: (props: RenderChildProps) => React.JSX.Element;
}

// This container is used to handle the CRUD
const SingleTypeFormWrapper = ({ children, slug }: SingleTypeFormWrapperProps) => {
  const allLayoutData = useTypedSelector(
    (state) => state['content-manager_editViewLayoutManager'].currentLayout
  );
  const queryClient = useQueryClient();
  const { trackUsage } = useTracking();
  const { push } = useHistory();
  const { setCurrentStep } = useGuidedTour();
  const [isCreatingEntry, setIsCreatingEntry] = React.useState(true);
  const [{ query, rawQuery }] = useQueryParams();
  const params = buildValidGetParams(query);
  const toggleNotification = useNotification();
  const dispatch = useTypedDispatch();
  const { formatAPIError } = useAPIErrorHandler(getTranslation);
  const fetchClient = useFetchClient();
  const { post, put, del } = fetchClient;

  const { componentsDataStructure, contentTypeDataStructure, data, isLoading, status } =
    useTypedSelector((state) => state['content-manager_editViewCrudReducer']);

  const cleanReceivedData = React.useCallback(
    (data: EntityData) => {
      const cleaned = removePasswordFieldsFromData(
        data,
        allLayoutData.contentType!,
        allLayoutData.components
      );

      // This is needed in order to add a unique id for the repeatable components, in order to make the reorder easier
      return formatContentTypeData(cleaned, allLayoutData.contentType!, allLayoutData.components);
    },
    [allLayoutData]
  );

  React.useEffect(() => {
    return () => {
      dispatch(resetProps());
    };
  }, [dispatch]);

  React.useEffect(() => {
    if (!allLayoutData) {
      return;
    }

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

  // Check if creation mode or editing mode
  React.useEffect(() => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();

    const fetchData = async (source: CancelTokenSource) => {
      dispatch(getData());

      setIsCreatingEntry(true);

      try {
        const { data } = await fetchClient.get(`/content-manager/single-types/${slug}`, {
          cancelToken: source.token,
          params,
        });

        dispatch(getDataSucceeded(cleanReceivedData(data)));

        setIsCreatingEntry(false);
      } catch (err) {
        if (axios.isCancel(err)) {
          return;
        }

        const responseStatus = get(err, 'response.status', null);

        // Creating a single type
        if (responseStatus === 404) {
          dispatch(initForm(rawQuery, true));
        }

        if (responseStatus === 403) {
          toggleNotification({
            type: 'info',
            message: { id: getTranslation('permissions.not-allowed.update') },
          });

          push('/');
        }
      }
    };

    fetchData(source);

    return () => source.cancel('Operation canceled by the user.');
  }, [fetchClient, cleanReceivedData, push, slug, dispatch, params, rawQuery, toggleNotification]);

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

        const { data } = await del<Contracts.SingleTypes.Delete.Response>(
          `/content-manager/single-types/${slug}`,
          {
            params,
          }
        );

        toggleNotification({
          type: 'success',
          message: { id: getTranslation('success.record.delete') },
        });

        trackUsage('didDeleteEntry', trackerProperty);

        setIsCreatingEntry(true);
        dispatch(initForm(rawQuery, true));

        return Promise.resolve(data);
      } catch (err) {
        trackUsage('didNotDeleteEntry', { error: err, ...trackerProperty });

        if (err instanceof AxiosError) {
          displayErrors(err);
        }

        return Promise.reject(err);
      }
    },
    [trackUsage, del, slug, params, toggleNotification, dispatch, rawQuery, displayErrors]
  );

  const onPost: RenderChildProps['onPost'] = React.useCallback(
    async (body, trackerProperty) => {
      try {
        dispatch(setStatus('submit-pending'));

        const { data } = await put<
          Contracts.SingleTypes.CreateOrUpdate.Response,
          AxiosResponse<Contracts.SingleTypes.CreateOrUpdate.Response>,
          Contracts.SingleTypes.CreateOrUpdate.Request['body']
        >(`/content-manager/single-types/${slug}`, body, {
          params: query,
        });

        trackUsage('didCreateEntry', trackerProperty);
        toggleNotification({
          type: 'success',
          message: { id: getTranslation('success.record.save') },
        });

        setCurrentStep('contentManager.success');

        // TODO: need to find a better place, or a better abstraction
        queryClient.invalidateQueries(['relation']);

        dispatch(submitSucceeded(cleanReceivedData(data)));
        setIsCreatingEntry(false);

        dispatch(setStatus('resolved'));

        return Promise.resolve(data);
      } catch (err) {
        trackUsage('didNotCreateEntry', { error: err, ...trackerProperty });

        if (err instanceof AxiosError) {
          displayErrors(err);
        }

        dispatch(setStatus('resolved'));

        return Promise.reject(err);
      }
    },
    [
      slug,
      dispatch,
      put,
      query,
      trackUsage,
      toggleNotification,
      setCurrentStep,
      queryClient,
      cleanReceivedData,
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
        } = await fetchClient.get<Contracts.SingleTypes.CountDraftRelations.Response>(
          `/content-manager/single-types/${slug}/actions/countDraftRelations`
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
    }, [trackUsage, slug, dispatch, fetchClient, displayErrors]);

  const onPublish: RenderChildProps['onPublish'] = React.useCallback(async () => {
    try {
      trackUsage('willPublishEntry');

      dispatch(setStatus('publish-pending'));

      const { data } = await post<Contracts.SingleTypes.Publish.Response>(
        `/content-manager/single-types/${slug}/actions/publish`,
        {},
        {
          params,
        }
      );

      trackUsage('didPublishEntry');
      toggleNotification({
        type: 'success',
        message: { id: getTranslation('success.record.publish') },
      });

      dispatch(submitSucceeded(cleanReceivedData(data)));

      dispatch(setStatus('resolved'));

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
    slug,
    dispatch,
    post,
    params,
    toggleNotification,
    cleanReceivedData,
    displayErrors,
  ]);

  const onPut: RenderChildProps['onPut'] = React.useCallback(
    async (body, trackerProperty) => {
      try {
        trackUsage('willEditEntry', trackerProperty);

        dispatch(setStatus('submit-pending'));

        const { data } = await put<
          Contracts.SingleTypes.CreateOrUpdate.Response,
          AxiosResponse<Contracts.SingleTypes.CreateOrUpdate.Response>,
          Contracts.SingleTypes.CreateOrUpdate.Request['body']
        >(`/content-manager/single-types/${slug}`, body, {
          params: query,
        });

        toggleNotification({
          type: 'success',
          message: { id: getTranslation('success.record.save') },
        });

        trackUsage('didEditEntry', trackerProperty);

        // TODO: need to find a better place, or a better abstraction
        queryClient.invalidateQueries(['relation']);

        dispatch(submitSucceeded(cleanReceivedData(data)));

        dispatch(setStatus('resolved'));

        return Promise.resolve(data);
      } catch (err) {
        if (err instanceof AxiosError) {
          displayErrors(err);
        }

        trackUsage('didNotEditEntry', { error: err, ...trackerProperty });

        dispatch(setStatus('resolved'));

        return Promise.reject(err);
      }
    },
    [
      slug,
      trackUsage,
      dispatch,
      put,
      query,
      toggleNotification,
      queryClient,
      cleanReceivedData,
      displayErrors,
    ]
  );

  const onUnpublish = React.useCallback(async () => {
    dispatch(setStatus('unpublish-pending'));

    try {
      trackUsage('willUnpublishEntry');

      const { data } = await post<Contracts.SingleTypes.UnPublish.Response>(
        `/content-manager/single-types/${slug}/actions/unpublish`,
        {},
        {
          params,
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
    }
  }, [
    slug,
    dispatch,
    trackUsage,
    post,
    params,
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
    onDraftRelationCheck,
    onPublish,
    onPut,
    onUnpublish,
    redirectionLink: '/',
    status,
  });
};

export { SingleTypeFormWrapper };
export type { RenderChildProps };
