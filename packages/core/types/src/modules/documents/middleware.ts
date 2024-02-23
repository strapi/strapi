// Utility type to reuse Param definition in MiddlewareContext
import type { Common } from '../..';
import type * as ServiceInstanceTypes from './service-instance';

export interface Context<
  TAction extends keyof ServiceInstanceTypes.Any = keyof ServiceInstanceTypes.Any,
  TArgs = Parameters<ServiceInstanceTypes.Any[TAction]>
> {
  uid: Common.UID.ContentType;
  action: TAction;
  args: TArgs;
}

export type Middleware = (
  ctx: Context,
  next: (ctx: Context) => ReturnType<ServiceInstanceTypes.Any[keyof ServiceInstanceTypes.Any]>
) => ReturnType<ServiceInstanceTypes.Any[keyof ServiceInstanceTypes.Any]>;
