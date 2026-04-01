import type { Core, Modules } from '@strapi/types';

const disabledAdminStub: Modules.AI.AiAdminService = {
  isEnabled(): boolean {
    return false;
  },
  getAiToken(): Promise<never> {
    return Promise.reject(new Error('AI admin service is not enabled'));
  },
  getAiUsage(): Promise<never> {
    return Promise.reject(new Error('AI admin service is not enabled'));
  },
  getAIFeatureConfig(): Promise<never> {
    return Promise.reject(new Error('AI admin service is not enabled'));
  },
};

export const createAiNamespace = (strapi: Core.Strapi): Modules.AI.AiNamespace => ({
  get admin(): Modules.AI.AiAdminService {
    try {
      return strapi.get('ai.admin');
    } catch {
      return disabledAdminStub;
    }
  },
});
