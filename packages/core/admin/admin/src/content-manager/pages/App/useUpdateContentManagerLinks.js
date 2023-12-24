import { useEffect } from 'react';

import { useNotification, useStrapiApp } from '@strapi/helper-plugin';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import { HOOKS } from '../../../constants';

import { updateLinksAction } from './actions';
import { selectAppDomain } from './selectors';

const { MUTATE_COLLECTION_TYPES_LINKS, MUTATE_SINGLE_TYPES_LINKS } = HOOKS;

const useUpdateContentManagerLinks = () => {
  const dispatch = useDispatch();
  const toggleNotification = useNotification();
  const location = useLocation();
  const state = useSelector(selectAppDomain());
  const { runHookWaterfall } = useStrapiApp();

  const updateLinks = () => {
    try {
      const { ctLinks: authorizedCollectionTypeLinks } = runHookWaterfall(
        MUTATE_COLLECTION_TYPES_LINKS,
        {
          ctLinks: state.collectionTypeLinks,
          models: state.models,
        }
      );
      const { stLinks: authorizedSingleTypeLinks } = runHookWaterfall(MUTATE_SINGLE_TYPES_LINKS, {
        stLinks: state.singleTypeLinks,
        models: state.models,
      });

      const actionToDispatch = updateLinksAction({
        authorizedCollectionTypeLinks,
        authorizedSingleTypeLinks,
      });

      dispatch(actionToDispatch);
    } catch (err) {
      console.error(err);
      toggleNotification({ type: 'warning', message: { id: 'notification.error' } });
    }
  };

  useEffect(() => {
    updateLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, location]);
};

export default useUpdateContentManagerLinks;
