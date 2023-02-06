/**
 *
 * useFetchClient
 *
 */
import { useEffect, useRef, useMemo } from 'react';
import getFetchClient from '../../utils/getFetchClient';

const useFetchClient = () => {
  const controller = useRef(null);

  if (controller.current === null) {
    controller.current = new AbortController();
  }

  useEffect(() => {
    return () => {
      controller.current.abort();
    };
  }, []);

  return useMemo(
    () =>
      getFetchClient({
        signal: controller.current.signal,
      }),
    []
  );
};

export default useFetchClient;
