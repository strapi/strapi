import axios from 'axios';
import { useEffect } from 'react';
import { getFetchClient } from '../../utils/getFetchClient';

const cancelToken = () => {
  const CancelToken = axios.CancelToken;
  const source = CancelToken.source();

  return source;
};

const useFetchClient = () => {
  const source = cancelToken();
  useEffect(() => {
    return () => {
      // when unmount cancel the axios request
      source.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const defaultOptions = {
    cancelToken: source.token,
  };

  return getFetchClient(defaultOptions);
};

export default useFetchClient;
