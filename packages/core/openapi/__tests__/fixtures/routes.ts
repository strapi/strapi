import { Core } from '@strapi/types';

export const test = [
  { info: { type: 'content-api' }, method: 'GET', path: '/test1', handler: '' },
  { info: { type: 'admin' }, method: 'POST', path: '/test2', handler: '' },
  { info: { type: 'content-api' }, method: 'DELETE', path: '/test3', handler: '' },
] satisfies Core.Route[];

export const foobar = [
  { info: { type: 'content-api' }, method: 'PUT', path: '/foo', handler: '' },
  { info: { type: 'admin' }, method: 'PATCH', path: '/bar', handler: '' },
  { info: { type: 'admin' }, method: 'HEAD', path: '/baz', handler: '' },
] satisfies Core.Route[];
