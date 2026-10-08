import { useEffect } from 'react';

import { useAIAvailability } from '@strapi/admin/strapi-admin/ee';

import { prefetchAIToken } from '../lib/aiClient';

export const usePrefetchAIToken = () => {
  const isAIAvailable = useAIAvailability();

  useEffect(() => {
    if (!isAIAvailable) {
      return;
    }

    prefetchAIToken();
  }, [isAIAvailable]);
};
