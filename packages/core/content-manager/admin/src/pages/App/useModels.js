import { request, useNotification, useRBACProvider, useStrapiApp } from '@strapi/helper-plugin';
import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getData, resetProps, setContentTypeLinks } from './actions';
import { getRequestUrl } from '../../utils';
import { selectAppDomain } from './selectors';
import getContentTypeLinks from './utils/getContentTypeLinks';

const useModels = () => {
  const dispatch = useDispatch();
  const toggleNotification = useNotification();
  const state = useSelector(selectAppDomain());
  const fetchDataRef = useRef();
  const { allPermissions } = useRBACProvider();
  const { runHookWaterfall } = useStrapiApp();

  const fetchData = async signal => {
    dispatch(getData());

    try {
      const [{ data: components }, { data: models }] = await Promise.all(
        ['components', 'content-types'].map(endPoint =>
          request(getRequestUrl(endPoint), { method: 'GET', signal })
        )
      );

      const { authorizedCtLinks, authorizedStLinks } = await getContentTypeLinks(
        models,
        allPermissions,
        toggleNotification
      );

      const { ctLinks } = runHookWaterfall('cm/mutate-collection-type-links', {
        ctLinks: authorizedCtLinks,
        models,
      });
      const { stLinks } = runHookWaterfall('cm/mutate-single-type-links', {
        stLinks: authorizedStLinks,
        models,
      });

      const actionToDispatch = setContentTypeLinks(ctLinks, stLinks, models, components);

      dispatch(actionToDispatch);
    } catch (err) {
      console.error(err);
      toggleNotification({ type: 'warning', message: { id: 'notification.error' } });
    }
  };

  fetchDataRef.current = fetchData;

  const abortController = new AbortController();
  const { signal } = abortController;

  useEffect(() => {
    fetchDataRef.current(signal);

    return () => {
      abortController.abort();
      dispatch(resetProps());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, toggleNotification]);

  return { ...state, refetchData: fetchDataRef.current };
};

export default useModels;
