// Utility type to reuse Param definition in MiddlewareContext
import type * as UID from '../../uid';
import type { ServiceInstance } from './service-instance';

export interface Context<
  TAction extends keyof ServiceInstance = keyof ServiceInstance,
  TArgs = Parameters<ServiceInstance[TAction]>
> {
  uid: UID.ContentType;
  action: TAction;
  args: TArgs;
}

export type Middleware = (
  ctx: Context,
  next: (ctx: Context) => ReturnType<ServiceInstance[keyof ServiceInstance]>
) => ReturnType<ServiceInstance[keyof ServiceInstance]>;
