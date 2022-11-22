import { useEffect } from 'react';
import { cancelToken, getFetchClient } from '../../utils/getFetchClient';

const useFetchClient = () => {
  const source = cancelToken();
  useEffect(() => {
    return () => {
      // when unmount cancel the axios request
      source.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const options = {
    cancelToken: source.token,
  };

  return getFetchClient(options);
};

export default useFetchClient;
