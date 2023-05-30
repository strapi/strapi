import type koa from 'koa';

export type ControllerHandler = <T>(
  context: koa.ExtendableContext,
  next: koa.Next
) => Promise<T | void> | T | void;

export type Controller = Record<string, ControllerHandler>;
