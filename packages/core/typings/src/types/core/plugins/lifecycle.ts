type LifecycleMethod<TStrapi> = ({ strapi }: { strapi: TStrapi }) => Promise<unknown> | unknown;
export interface Lifecycle<TStrapi> {
  register?: LifecycleMethod<TStrapi>;
  bootstrap?: LifecycleMethod<TStrapi>;
  destroy?: LifecycleMethod<TStrapi>;
}
