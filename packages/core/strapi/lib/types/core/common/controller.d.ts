import type koa from 'koa';

export type ControllerHandler = <T>(
  context: koa.ExtendableContext,
  next: koa.Next
) => Promise<T> | T;

export type Controller = Record<string, ControllerHandler>;
