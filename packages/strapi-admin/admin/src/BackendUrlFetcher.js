import { useEffect, useState } from 'react';
import 'whatwg-fetch';

export default ({ children, configUrl }) => {
  const [hasFetched, setHasFetched] = useState();

  useEffect(() => {
    if (hasFetched) return;
    const originalBackendUrl = strapi.backendURL;
    strapi.backendURL = null;

    const fetchBackendUrl = async () => {
      try {
        const response = await fetch(configUrl);
        const newBackendUrl = await response.text();

        // just do a simple check to verify that what we got was indeed a valid URL
        if (!newBackendUrl.startsWith('http')) throw new Error('Probably not a backend URL');

        strapi.backendURL = newBackendUrl;
      } catch (error) {
        // no backend url found - using original url
        strapi.backendURL = originalBackendUrl;
      }
      setHasFetched(true);
    };

    fetchBackendUrl();
  });

  if (!hasFetched) return null;

  return children;
};
