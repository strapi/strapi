import createTypeRegistry from '../services/type-registry';

export type TypeRegistry = ReturnType<ReturnType<typeof createTypeRegistry>['new']>;
