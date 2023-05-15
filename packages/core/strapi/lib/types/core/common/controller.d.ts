import type koa from 'koa';

export type ControllerHandler = (
  context: koa.ExtendableContext,
  next: koa.Next
) => Promise<void> | void | Promise<unknown> | unknown;

export type Controller = Record<string, ControllerHandler>;
