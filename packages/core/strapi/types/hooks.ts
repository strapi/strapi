
export type HookHandler = (context: any) => any;

type AsyncHook = {
  handlers: HookHandler[];
  register(handler: HookHandler): ThisType<AsyncHook>;
  delete(handler: HookHandler): ThisType<AsyncHook>;
  call(args?: any): Promise<void>;
};


type SyncHook = {
  get handlers(): HookHandler[];
  register(handler: HookHandler): ThisType<SyncHook>;
  delete(handler: HookHandler): ThisType<SyncHook>;
  call(): void;
};


export type Hook = AsyncHook | SyncHook

export interface StrapiHooks extends Record<string, Hook> {
  'strapi::content-types.beforeSync': Hook;
  'strapi::content-types.afterSync': Hook;
}