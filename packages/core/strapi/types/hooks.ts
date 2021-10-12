
type Handler = (context: any) => any;

type AsyncHook = {
  handlers: Handler[];
  register(handler: Handler): ThisType<AsyncHook>;
  delete(handler: Handler): ThisType<AsyncHook>;
  call(args?: any): Promise<void>;
};


type SyncHook = {
  get handlers(): Handler[];
  register(handler: Handler): ThisType<SyncHook>;
  delete(handler: Handler): ThisType<SyncHook>;
  call(): void;
};


export type Hook = AsyncHook | SyncHook

export interface StrapiHooks extends Record<string, Hook> {
  'strapi::content-types.beforeSync': Hook;
  'strapi::content-types.afterSync': Hook;
}