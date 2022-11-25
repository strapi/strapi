import { useEffect, useRef } from 'react';
import { getFetchClient } from '../../utils/getFetchClient';

const cancelToken = () => {
  const controller = new AbortController();

  return controller;
};

const useFetchClient = () => {
  const controller = useRef(null);

  if (controller.current === null) {
    controller.current = cancelToken();
  }
  useEffect(() => {
    return () => {
      controller.current.abort();
    };
  }, []);

  const defaultOptions = {
    signal: controller.current.signal,
  };

  return getFetchClient(defaultOptions);
};

export default useFetchClient;
