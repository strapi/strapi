import { useEffect, useState } from 'react';
import { request } from 'strapi-helper-plugin';
import pluginId from '../pluginId';

const useFetch = endPoints => {
  const abortController = new AbortController();
  const { signal } = abortController;
  const [state, setState] = useState({ data: {}, isLoading: true });

  useEffect(() => {
    const getData = async () => {
      try {
        const data = await Promise.all(
          endPoints.map(endPoint =>
            request(`/${pluginId}/${endPoint}`, {
              method: 'GET',
              signal,
            })
          )
        );
        setState({ data, isLoading: false });
      } catch (err) {
        strapi.notification.error(`${pluginId}.strapi.notification.error`);
      }
    };

    getData();

    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data: state.data, isLoading: state.isLoading };
};

export default useFetch;
