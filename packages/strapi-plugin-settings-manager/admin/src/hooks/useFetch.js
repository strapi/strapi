import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { request } from 'strapi-helper-plugin';
import pluginId from '../pluginId';

const useFetch = (endPoints, deps = []) => {
  const abortController = new AbortController();
  const { signal } = abortController;
  const [state, setState] = useState({ data: {}, isLoading: true });

  useEffect(() => {
    const getData = async () => {
      try {
        setState({ data: {}, isLoading: true });
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
  }, deps);

  return { data: state.data, isLoading: state.isLoading };
};

useFetch.propTypes = {
  endPoints: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default useFetch;
