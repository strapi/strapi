import type { Core } from '@strapi/types';
import { defineProvider } from './provider';
import { createAiNamespace } from '../services/ai';

export default defineProvider({
  init(strapi) {
    strapi.add('ai', (s: Core.Strapi) => createAiNamespace(s));
  },
});
