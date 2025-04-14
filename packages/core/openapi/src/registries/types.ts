import type { OpenAPIV3 } from 'openapi-types';

export type ComponentType = keyof OpenAPIV3.ComponentsObject;

export type Component<T extends ComponentType> = Exclude<
  Exclude<OpenAPIV3.ComponentsObject[T], undefined>[string],
  OpenAPIV3.ReferenceObject
>;
