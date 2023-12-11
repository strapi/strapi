import { useNotifyAT } from '@strapi/design-system';
import {
  useFetchClient,
  useNotification,
  useRBACProvider,
  useStrapiApp,
} from '@strapi/helper-plugin';
import axios from 'axios';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';

import { HOOKS } from '../../../constants';
import { getTrad } from '../../utils';

import { getInitData, setInitData } from './actions';
import { selectAppDomain } from './selectors';
import getContentTypeLinks from './utils/getContentTypeLinks';

const { MUTATE_COLLECTION_TYPES_LINKS, MUTATE_SINGLE_TYPES_LINKS } = HOOKS;

const useContentManagerInitData = () => {
  const dispatch = useDispatch();
  const toggleNotification = useNotification();
  const state = useSelector(selectAppDomain());
  const { allPermissions } = useRBACProvider();
  const { runHookWaterfall } = useStrapiApp();
  const { notifyStatus } = useNotifyAT();
  const { formatMessage } = useIntl();
  const { get } = useFetchClient();

  useQuery(
    ['content-manager', 'initData'],
    async () => {
      dispatch(getInitData());

      const response = await get('/content-manager/init');

      return response.data;
    },
    {
      onError(error) {
        if (axios.isCancel(error)) {
          return;
        }
        // Handle error
        console.error(error);
        toggleNotification({ type: 'warning', message: { id: 'notification.error' } });
      },
      async onSuccess(data) {
        const {
          data: { components, contentTypes: models, fieldSizes },
        } = data;
        // Handle success
        notifyStatus(
          formatMessage({
            id: getTrad('App.schemas.data-loaded'),
            defaultMessage: 'The schemas have been successfully loaded.',
          })
        );

        const unmutatedContentTypeLinks = await getContentTypeLinks({
          models,
          userPermissions: allPermissions,
          toggleNotification,
        });

        const { ctLinks: authorizedCollectionTypeLinks } = runHookWaterfall(
          MUTATE_COLLECTION_TYPES_LINKS,
          {
            ctLinks: unmutatedContentTypeLinks.authorizedCollectionTypeLinks,
            models,
          }
        );
        const { stLinks: authorizedSingleTypeLinks } = runHookWaterfall(MUTATE_SINGLE_TYPES_LINKS, {
          stLinks: unmutatedContentTypeLinks.authorizedSingleTypeLinks,
          models,
        });

        const actionToDispatch = setInitData({
          authorizedCollectionTypeLinks,
          authorizedSingleTypeLinks,
          contentTypeSchemas: models,
          components,
          fieldSizes,
        });

        dispatch(actionToDispatch);
      },
    }
  );

  return { ...state };
};

export default useContentManagerInitData;
