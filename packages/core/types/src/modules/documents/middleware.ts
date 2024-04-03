// Utility type to reuse Param definition in MiddlewareContext
import type { Schema } from '../..';
import type { ServiceInstance } from './service-instance';

export interface Context<
  TAction extends keyof ServiceInstance = keyof ServiceInstance,
  TArgs = Parameters<ServiceInstance[TAction]>,
> {
  contentType: Schema.ContentType;
  action: TAction;
  args: TArgs;
}

export type Middleware = (
  ctx: Context,
  next: () => Promise<ReturnType<ServiceInstance[keyof ServiceInstance]>>
) =>
  | ReturnType<ServiceInstance[keyof ServiceInstance]>
  | Promise<ReturnType<ServiceInstance[keyof ServiceInstance]>>;
