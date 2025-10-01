import { useSettings } from "./useSettings";

export const useAIAvailability = () => {
  const isAiEnabled = window.strapi.ai?.enabled !== false;
  // @ts-expect-error - incorrect window types
  const isEE = window.strapi?.isEE;
  const shouldMakeRequest = isAiEnabled && isEE;

  const {status, data} = useSettings(shouldMakeRequest);

  if (!shouldMakeRequest) {
    return {status: 'success' as const, isEnabled: false};
  }

  return { status, isEnabled: data?.aiMetadata };
};
