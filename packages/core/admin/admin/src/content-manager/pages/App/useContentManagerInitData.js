import {
  useNotification,
  useRBACProvider,
  useStrapiApp,
  useFetchClient,
} from '@strapi/helper-plugin';
import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNotifyAT } from '@strapi/design-system';
import axios from 'axios';
import { useIntl } from 'react-intl';
import { MUTATE_COLLECTION_TYPES_LINKS, MUTATE_SINGLE_TYPES_LINKS } from '../../../exposedHooks';
import { getRequestUrl, getTrad } from '../../utils';
import { getInitData, resetInitData, setInitData } from './actions';
import { selectAppDomain } from './selectors';
import getContentTypeLinks from './utils/getContentTypeLinks';

const useContentManagerInitData = () => {
  const dispatch = useDispatch();
  const toggleNotification = useNotification();
  const state = useSelector(selectAppDomain());
  const fetchDataRef = useRef();
  const { allPermissions } = useRBACProvider();
  const { runHookWaterfall } = useStrapiApp();
  const CancelToken = axios.CancelToken;
  const source = CancelToken.source();
  const { notifyStatus } = useNotifyAT();
  const { formatMessage } = useIntl();
  const { get } = useFetchClient();

  const fetchData = async () => {
    dispatch(getInitData());

    try {
      const {
        data: {
          data: { components, contentTypes: models, fieldSizes },
        },
      } = await get(getRequestUrl('init'), { cancelToken: source.token });
      notifyStatus(
        formatMessage({
          id: getTrad('App.schemas.data-loaded'),
          defaultMessage: 'The schemas have been successfully loaded.',
        })
      );

      const { authorizedContentTypeLinks, authorizedSingleTypeLinks } = await getContentTypeLinks({
        models,
        userPermissions: allPermissions,
        toggleNotification,
      });

      const { ctLinks } = runHookWaterfall(MUTATE_COLLECTION_TYPES_LINKS, {
        ctLinks: authorizedContentTypeLinks,
        models,
      });
      const { stLinks } = runHookWaterfall(MUTATE_SINGLE_TYPES_LINKS, {
        stLinks: authorizedSingleTypeLinks,
        models,
      });

      const actionToDispatch = setInitData({
        authorizedCollectionTypeLinks: ctLinks,
        authorizedSingleTypeLinks: stLinks,
        contentTypeSchemas: models,
        components,
        fieldSizes,
      });

      dispatch(actionToDispatch);
    } catch (err) {
      if (axios.isCancel(err)) {
        return;
      }

      console.error(err);

      toggleNotification({ type: 'warning', message: { id: 'notification.error' } });
    }
  };

  fetchDataRef.current = fetchData;

  useEffect(() => {
    fetchDataRef.current();

    return () => {
      source.cancel('Operation canceled by the user.');
      dispatch(resetInitData());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, toggleNotification]);

  return { ...state, refetchData: fetchDataRef.current };
};

export default useContentManagerInitData;
