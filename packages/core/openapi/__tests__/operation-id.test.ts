import type { Core } from '@strapi/types';

import { OperationIDAssembler } from '../src/assemblers/document/path/path-item/operation';
import type { OperationContext } from '../src/types';

const getOperationId = (path: string) => {
  const context = { output: { data: {} } } as unknown as OperationContext;
  const route = {
    method: 'GET',
    path,
    handler: 'auth.connect',
    info: { pluginName: 'users-permissions' },
  } as unknown as Core.Route;

  new OperationIDAssembler().assemble(context, route);

  return context.output.data.operationId;
};

describe('OperationIDAssembler', () => {
  it('keeps the id a wildcard had when it was written (.*)', () => {
    expect(getOperationId('/connect/(.*)')).toBe('users-permissions/get/connect_____');
    expect(getOperationId('/connect/{*path}')).toBe('users-permissions/get/connect_____');
    expect(getOperationId('/connect/*path')).toBe('users-permissions/get/connect_____');
  });

  it('names path parameters', () => {
    expect(getOperationId('/roles/:id')).toBe('users-permissions/get/roles_by_id');
  });
});
