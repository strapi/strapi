export const useAIAvailability = (): boolean => {
  const isAiEnabled = window.strapi.ai?.enabled !== false;
  // @ts-expect-error - incorrect window types
  const isEE = window.strapi?.isEE;

  return !!isEE && isAiEnabled;
};
