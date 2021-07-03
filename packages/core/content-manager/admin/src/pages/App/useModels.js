import { request, useNotification, useRBACProvider } from '@strapi/helper-plugin';
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

      const actionToDispatch = setContentTypeLinks(
        authorizedCtLinks,
        authorizedStLinks,
        models,
        components
      );

      dispatch(actionToDispatch);
    } catch (err) {
      console.error(err);
      toggleNotification({ type: 'warning', message: { id: 'notification.error' } });
    }
  };

  fetchDataRef.current = fetchData;

  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    fetchDataRef.current(signal);

    return () => {
      abortController.abort();
      dispatch(resetProps());
    };
  }, [dispatch, toggleNotification]);

  return state;
};

export default useModels;
