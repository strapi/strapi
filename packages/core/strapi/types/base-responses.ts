declare module 'koa' {
  interface BaseContext {
    badRequest(msg?: string, ...rest: any): void;
    unauthorized(msg?: string, ...rest: any): void;
    paymentRequired(msg?: string, ...rest: any): void;
    forbidden(msg?: string, ...rest: any): void;
    notFound(msg?: string, ...rest: any): void;
    methodNotAllowed(msg?: string, ...rest: any): void;
    notAcceptable(msg?: string, ...rest: any): void;
    proxyAuthRequired(msg?: string, ...rest: any): void;
    clientTimeout(msg?: string, ...rest: any): void;
    conflict(msg?: string, ...rest: any): void;
    resourceGone(msg?: string, ...rest: any): void;
    lengthRequired(msg?: string, ...rest: any): void;
    preconditionFailed(msg?: string, ...rest: any): void;
    entityTooLarge(msg?: string, ...rest: any): void;
    uriTooLong(msg?: string, ...rest: any): void;
    unsupportedMediaType(msg?: string, ...rest: any): void;
    rangeNotSatisfiable(msg?: string, ...rest: any): void;
    expectationFailed(msg?: string, ...rest: any): void;
    teapot(msg?: string, ...rest: any): void;
    badData(msg?: string, ...rest: any): void;
    locked(msg?: string, ...rest: any): void;
    failedDependency(msg?: string, ...rest: any): void;
    preconditionRequired(msg?: string, ...rest: any): void;
    tooManyRequests(msg?: string, ...rest: any): void;
    illegal(msg?: string, ...rest: any): void;
    badImplementation(msg?: string, ...rest: any): void;
    notImplemented(msg?: string, ...rest: any): void;
    badGateway(msg?: string, ...rest: any): void;
    serverUnavailable(msg?: string, ...rest: any): void;
    gatewayTimeout(msg?: string, ...rest: any): void;
    send(data: any, status?: number): void;
    created(data: any): void;
    deleted(data: any): void;
  }
}

export {};
