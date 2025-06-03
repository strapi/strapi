import * as React from 'react';

import { getFetchClient } from '../utils/getFetchClient';

/**
 * @public
 * @description This is an abstraction around the native fetch exposed by a hook. It provides a simple interface to handle API calls
 * to the Strapi backend.
 * It handles request cancellations inside the hook with an {@link https://developer.mozilla.org/en-US/docs/Web/API/AbortController} AbortController.
 * This is typically triggered when the component is unmounted so all the requests that it is currently making are aborted.
 * The expected URL style includes either a protocol (such as HTTP or HTTPS) or a relative URL. The URLs with domain and path but not protocol are not allowed (ex: `www.example.com`).
 * @example
 * ```tsx
 * import * as React from 'react';
 * import { useFetchClient } from '@strapi/admin/admin';
 *
 * const MyComponent = () => {
 *   const [items, setItems] = React.useState([]);
 *   const { get } = useFetchClient();
 *   const requestURL = "/some-endpoint";
 *
 *   const handleGetData = async () => {
 *     const { data } = await get(requestURL);
 *     setItems(data.items);
 *   };
 *
 *   return (
 *    <div>
 *      <div>
 *       {
 *         items && items.map(item => <h2 key={item.uuid}>{item.name}</h2>))
 *       }
 *     </div>
 *    </div>
 *   );
 * };
 * ```
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/AbortController} AbortController.
 */
const useFetchClient = () => {
  const controller = React.useRef<AbortController | null>(null);

  if (controller.current === null) {
    controller.current = new AbortController();
  }

  React.useEffect(() => {
    return () => {
      controller.current!.abort();
    };
  }, []);

  return React.useMemo(
    () =>
      getFetchClient({
        signal: controller.current!.signal,
      }),
    []
  );
};

export { useFetchClient };
