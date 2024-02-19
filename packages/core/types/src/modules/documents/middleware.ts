// Utility type to reuse Param definition in MiddlewareContext
import type { Common } from '../..';
import type { ServiceInstance } from './service-instance';

export interface Context<
  TContentTypeUID extends Common.UID.ContentType = Common.UID.ContentType,
  TAction extends keyof ServiceInstance<TContentTypeUID> = keyof ServiceInstance<TContentTypeUID>
> {
  uid: TContentTypeUID;
  action: TAction;
  args: Parameters<ServiceInstance<TContentTypeUID>[TAction]>;
}

export type Middleware<
  TContentTypeUID extends Common.UID.ContentType = Common.UID.ContentType,
  TAction extends keyof ServiceInstance<TContentTypeUID> = keyof ServiceInstance<TContentTypeUID>
> = (
  ctx: Context<TContentTypeUID, TAction>,
  next: (
    ctx: Context<TContentTypeUID, TAction>
  ) => ReturnType<ServiceInstance<TContentTypeUID>[TAction]>
) => ReturnType<ServiceInstance<TContentTypeUID>[TAction]>;
