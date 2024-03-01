// Utility type to reuse Param definition in MiddlewareContext
import { UID } from '../../public';
import type { ServiceInstance } from './service-instance';

export interface Context<
  TContentTypeUID extends UID.ContentType = UID.ContentType,
  TAction extends keyof ServiceInstance<TContentTypeUID> = keyof ServiceInstance<TContentTypeUID>
> {
  uid: TContentTypeUID;
  action: TAction;
  args: Parameters<ServiceInstance<TContentTypeUID>[TAction]>;
}

export type Middleware<
  TContentTypeUID extends UID.ContentType = UID.ContentType,
  TAction extends keyof ServiceInstance<TContentTypeUID> = keyof ServiceInstance<TContentTypeUID>
> = (
  ctx: Context<TContentTypeUID, TAction>,
  next: (
    ctx: Context<TContentTypeUID, TAction>
  ) => ReturnType<ServiceInstance<TContentTypeUID>[TAction]>
) => ReturnType<ServiceInstance<TContentTypeUID>[TAction]>;
