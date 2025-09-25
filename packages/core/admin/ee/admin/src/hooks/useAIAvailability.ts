export const useAIAvailability = (): boolean => {
  const isAiEnabled = window.strapi.ai?.enabled !== false;
  const isEE = window.strapi?.isEE;

  return !!isEE && isAiEnabled;
};
