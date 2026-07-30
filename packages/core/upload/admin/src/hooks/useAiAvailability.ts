import { useAIAvailability as useGlobalAIAvailability } from '@strapi/admin/strapi-admin/ee';

import { useSettings } from './useSettings';

export const useAIAvailability = () => {
  const isAiAvailable = useGlobalAIAvailability();
  const { status, data } = useSettings(isAiAvailable);

  if (!isAiAvailable) {
    return { status: 'success' as const, isEnabled: false };
  }

  return { status, isEnabled: data?.aiMetadata };
};
