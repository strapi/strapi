import type { UploadProvider } from '../types/plugin-services';

/**
 * Whether the upload provider implements `method`. It narrows `strapi.plugin('upload').provider`,
 * `unknown` to the admin with strict types (see {@link UploadProvider}).
 */
export const hasUploadProviderMethod = <TMethod extends keyof UploadProvider>(
  provider: unknown,
  method: TMethod
): provider is Pick<UploadProvider, TMethod> =>
  typeof provider === 'object' &&
  provider !== null &&
  typeof Reflect.get(provider, method) === 'function';
