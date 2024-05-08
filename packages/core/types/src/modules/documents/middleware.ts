// Utility type to reuse Param definition in MiddlewareContext
import type { Schema, UID } from '../..';
import type { ServiceInstance, ServiceParams } from './service-instance';

export type Context<TUID extends UID.ContentType = UID.ContentType> = {
  [TUIDKey in TUID]: {
    [TKey in keyof ServiceParams<TUIDKey>]: {
      contentType: Schema.ContentType<TUIDKey>;
      uid: TUIDKey;
      action: TKey;
      params: ServiceParams<TUIDKey>[TKey];
    };
  }[keyof ServiceParams<TUIDKey>];
}[TUID];

export type Middleware = (
  ctx: Context,
  next: () => ReturnType<ServiceInstance[keyof ServiceInstance]>
) => ReturnType<ServiceInstance[keyof ServiceInstance]> extends Promise<infer Return>
  ? Promise<Return>
  : Promise<ReturnType<ServiceInstance[keyof ServiceInstance]>>;
