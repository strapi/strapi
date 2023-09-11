export type LifecycleMethod<TStrapi> = ({
  strapi,
}: {
  strapi: TStrapi;
}) => Promise<unknown> | unknown;

export type Register<TStrapi> = LifecycleMethod<TStrapi>;
export type Bootstrap<TStrapi> = LifecycleMethod<TStrapi>;
export type Destroy<TStrapi> = LifecycleMethod<TStrapi>;
