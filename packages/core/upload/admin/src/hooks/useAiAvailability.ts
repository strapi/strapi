import { useAIAvailability as useGlobalAIAvailability } from '@strapi/admin/strapi-admin/ee';

import { useMediaLibraryPermissions } from './useMediaLibraryPermissions';
import { useSettings } from './useSettings';

export const useAIAvailability = () => {
  const isAiAvailable = useGlobalAIAvailability();
  const { canSettings } = useMediaLibraryPermissions();
  const { status, data } = useSettings(isAiAvailable && canSettings);

  if (!isAiAvailable) {
    return { status: 'success' as const, isEnabled: false };
  }

  if (!canSettings) {
    return { status: 'success' as const, isEnabled: false };
  }

  return { status, isEnabled: data?.aiMetadata };
};
