import { useEffect } from 'react';
import { cancelToken, getFetchClient } from '../../utils/getFetchClient';

const useFetchClient = () => {
  const source = cancelToken();
  useEffect(() => {
    return () => {
      // when unmount cancel the axios request
      source.cancel();
    };
  });

  // const options = {
  //   cancelToken: source.token,
  // };

  return getFetchClient();
};

export default useFetchClient;
