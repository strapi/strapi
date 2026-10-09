export const useAIAvailability = (): boolean =>
  window.strapi?.isEE === true && window.strapi.ai?.enabled === true;
